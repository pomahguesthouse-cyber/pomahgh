import React, { useState } from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Palette, Plus, Check, Trash2, Sparkles } from 'lucide-react';
import { useTemplatePresets } from '@/hooks/useTemplatePresets';

const TEMPLATE_COLORS: Record<string, string> = {
  'Modern': 'bg-teal-500',
  'Classic': 'bg-amber-700',
  'Minimalist': 'bg-gray-800',
  'Luxury': 'bg-yellow-500',
};

export function TemplatePresets() {
  const { templates, applyTemplate, saveAsTemplate } = useEditorMode();
  const { deleteTemplate, isDeleting } = useTemplatePresets();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  const systemTemplates = templates.filter(t => t.is_system);
  const customTemplates = templates.filter(t => !t.is_system);

  const handleApply = (templateId: string) => {
    applyTemplate(templateId);
    setAppliedTemplate(templateId);
    setTimeout(() => setAppliedTemplate(null), 2000);
  };

  const handleSave = async () => {
    if (!newTemplateName.trim()) return;
    await saveAsTemplate(newTemplateName.trim(), newTemplateDescription.trim());
    setNewTemplateName('');
    setNewTemplateDescription('');
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate(id);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* System Templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">System Templates</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {systemTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className={`h-16 ${TEMPLATE_COLORS[template.name] || 'bg-primary'}`} />
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </CardContent>
              <CardFooter className="p-3 pt-0">
                <Button
                  size="sm"
                  variant={appliedTemplate === template.id ? "default" : "outline"}
                  className="w-full h-7 text-xs"
                  onClick={() => handleApply(template.id)}
                >
                  {appliedTemplate === template.id ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Applied
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">My Templates</h3>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
                <DialogDescription>
                  Save your current theme and widget configuration as a reusable template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., My Custom Theme"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="A brief description of this template..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!newTemplateName.trim()}>
                  Save Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {customTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No custom templates yet</p>
            <p className="text-xs">Save your current configuration to create one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customTemplates.map((template) => (
              <div 
                key={template.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => handleApply(template.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
