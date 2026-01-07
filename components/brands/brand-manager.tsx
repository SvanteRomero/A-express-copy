'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/core/button";
import { getBrands, createBrand } from "@/lib/api-client";
import { Brand } from "@/components/brands/types";
import { Input } from "@/components/ui/core/input";

export function BrandManager() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [newBrandName, setNewBrandName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const res = await getBrands();
            if (res.data) {
                setBrands(res.data);
            } else {
                setError("Failed to fetch brands");
            }
        } catch (err) {
            setError("Failed to fetch brands");
        }
        setLoading(false);
    };

    const handleCreateBrand = async () => {
        if (newBrandName.trim() === "") return;
        try {
            const res = await createBrand({ name: newBrandName });
            if (res.data) {
                setBrands([...brands, res.data]);
                setNewBrandName("");
            } else {
                setError("Failed to create brand");
            }
        } catch (err) {
            setError("Failed to create brand");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <div className="flex gap-2">
                <Input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="New brand name"
                />
                <Button onClick={handleCreateBrand}>Add Brand</Button>
            </div>
            <ul className="mt-4 space-y-2">
                {brands.map(brand => (
                    <li key={brand.id} className="border p-2 rounded-md">{brand.name}</li>
                ))}
            </ul>
        </div>
    );
}
