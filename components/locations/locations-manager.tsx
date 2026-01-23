"use client"

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import { Label } from "@/components/ui/core/label";
import { Switch } from "@/components/ui/core/switch";
import { Trash2, Edit, Plus, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/feedback/alert-dialog";

import { Location } from "@/components/locations/types";

export function LocationsManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationIsWorkshop, setNewLocationIsWorkshop] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      // Fetch all locations including inactive ones for admin view
      const response = await apiClient.get("/locations/?include_inactive=true");
      if (response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    try {
      const response = await apiClient.post("/locations/", { name: newLocationName, is_workshop: newLocationIsWorkshop });
      if (response.data) {
        setLocations([...locations, response.data]);
        setNewLocationName("");
        setNewLocationIsWorkshop(false);
      }
    } catch (error) {
      console.error("Error adding location:", error);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    try {
      const response = await apiClient.put(`/locations/${editingLocation.id}/`, { name: editingLocation.name, is_workshop: editingLocation.is_workshop });
      if (response.data) {
        setLocations(
          locations.map((loc) => (loc.id === editingLocation.id ? response.data : loc))
        );
        setEditingLocation(null);
      }
    } catch (error) {
      console.error("Error updating location:", error);
    }
  };

  const handleDeleteLocation = async (id: number) => {
    try {
      // This will soft delete the location (mark as inactive)
      await apiClient.delete(`/locations/${id}/`);
      // Update local state to reflect inactive status
      setLocations(locations.map(loc =>
        loc.id === id ? { ...loc, is_active: false } : loc
      ));
    } catch (error) {
      console.error("Error deactivating location:", error);
    }
  };

  const handleReactivateLocation = async (id: number) => {
    try {
      await apiClient.post(`/locations/${id}/reactivate/`);
      // Update local state to reflect active status
      setLocations(locations.map(loc =>
        loc.id === id ? { ...loc, is_active: true } : loc
      ));
    } catch (error) {
      console.error("Error reactivating location:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Input
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          placeholder="New location name"
          className="flex-grow"
        />
        <div className="flex items-center space-x-2">
          <Switch
            id="new-is-workshop"
            checked={newLocationIsWorkshop}
            onCheckedChange={setNewLocationIsWorkshop}
          />
          <Label htmlFor="new-is-workshop">Workshop</Label>
        </div>
        <Button onClick={handleAddLocation}>
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>

      <div className="space-y-2">
        {locations.map((location) => (
          <div key={location.id} className="flex items-center justify-between p-2 border rounded-md">
            {editingLocation?.id === location.id ? (
              <div className="flex-grow flex items-center gap-4">
                <Input
                  value={editingLocation.name}
                  onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                  className="flex-grow"
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`edit-is-workshop-${location.id}`}
                    checked={editingLocation.is_workshop}
                    onCheckedChange={(checked) => setEditingLocation({ ...editingLocation, is_workshop: checked })}
                  />
                  <Label htmlFor={`edit-is-workshop-${location.id}`}>Workshop</Label>
                </div>
              </div>
            ) : (
              <span className={`flex-grow ${!location.is_active ? 'text-gray-400 italic' : ''}`}>
                {location.name} {location.is_workshop && "(Workshop)"} {!location.is_active && "(Inactive)"}
              </span>
            )}
            <div className="flex gap-2 ml-4">
              {editingLocation?.id === location.id ? (
                <Button onClick={handleUpdateLocation} size="sm">Save</Button>
              ) : (
                <>
                  <Button onClick={() => setEditingLocation(location)} size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  {!location.is_active && (
                    <Button
                      onClick={() => handleReactivateLocation(location.id)}
                      size="sm"
                      variant="ghost"
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deactivate Location?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will deactivate "{location.name}". It will no longer appear in dropdown lists,
                      but will remain visible in historical task records. You can reactivate it later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteLocation(location.id)}>
                      Deactivate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}