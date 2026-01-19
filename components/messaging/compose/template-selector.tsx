"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Label } from "@/components/ui/core/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/core/select";
import { Checkbox } from "@/components/ui/core/checkbox";
import { Textarea } from "@/components/ui/core/textarea";
import { MessageTemplate } from "../types";

interface TemplateSelectorProps {
    templates: MessageTemplate[];
    selectedTemplate: string;
    onSelectTemplate: (id: string) => void;
    useCustomMessage: boolean;
    onToggleCustom: (checked: boolean) => void;
    customMessage: string;
    onCustomMessageChange: (value: string) => void;
}

export function TemplateSelector({
    templates,
    selectedTemplate,
    onSelectTemplate,
    useCustomMessage,
    onToggleCustom,
    customMessage,
    onCustomMessageChange,
}: TemplateSelectorProps) {
    const currentTemplate = templates.find(t =>
        (t.key && t.key === selectedTemplate) ||
        (t.id && t.id.toString() === selectedTemplate)
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>Select potential recipients and customize your message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!useCustomMessage && (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Label>Template</Label>
                        <Select value={selectedTemplate} onValueChange={onSelectTemplate}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates
                                    .filter(t => t.name !== "General (Custom)")
                                    .map(t => {
                                        const value = t.key || t.id?.toString() || "";
                                        return (
                                            <SelectItem key={value} value={value}>
                                                {t.name} {t.is_default && <span className="ml-2 text-xs text-muted-foreground">[Default]</span>}
                                            </SelectItem>
                                        );
                                    })
                                }
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                        id="use-custom"
                        checked={useCustomMessage}
                        onCheckedChange={(checked) => onToggleCustom(!!checked)}
                    />
                    <Label htmlFor="use-custom" className="font-normal cursor-pointer">
                        Write a custom message instead
                    </Label>
                </div>

                {useCustomMessage && (
                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Label>Custom Message</Label>
                        <Textarea
                            placeholder="Type your message here..."
                            value={customMessage}
                            onChange={e => onCustomMessageChange(e.target.value)}
                            rows={4}
                        />
                        <p className="text-xs text-yellow-600">Note: Line breaks are not supported by the SMS provider.</p>
                    </div>
                )}

                {!useCustomMessage && currentTemplate && (
                    <div className="p-3 bg-muted rounded text-sm text-muted-foreground">
                        <span className="font-semibold block mb-1">Preview:</span>
                        {currentTemplate.content}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
