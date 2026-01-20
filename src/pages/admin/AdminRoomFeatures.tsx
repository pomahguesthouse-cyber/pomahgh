import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import * as Icons from "lucide-react";
import {
  useAdminRoomFeatures,
  useCreateRoomFeature,
  useUpdateRoomFeature,
  useDeleteRoomFeature,
  type RoomFeature,
} from "@/hooks/room/useRoomFeatures";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AVAILABLE_ICONS = [
  "Wifi", "Tv", "Wind", "Coffee", "Bath", "Refrigerator",
  "UtensilsCrossed", "Waves", "Dumbbell", "Car", "Users",
  "ShowerHead", "Bed", "Sofa", "Lamp", "Fan", "Heater",
  "Microwave", "WashingMachine", "Iron", "Lock", "Phone",
  "Music", "Camera", "Clock", "MapPin", "Key", "Home",
  "Sparkles", "Sun", "Moon", "Cloud", "Zap", "Star",
  "Circle", "Square", "Triangle", "Monitor"
];

export default function AdminRoomFeatures() {
  const { data: features, isLoading } = useAdminRoomFeatures();
  const createFeature = useCreateRoomFeature();
  const updateFeature = useUpdateRoomFeature();
  const deleteFeature = useDeleteRoomFeature();

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    feature_key: "",
    label: "",
    icon_name: "Circle",
    display_order: 0,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      feature_key: "",
      label: "",
      icon_name: "Circle",
      display_order: 0,
      is_active: true,
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (feature: RoomFeature) => {
    setFormData({
      feature_key: feature.feature_key,
      label: feature.label,
      icon_name: feature.icon_name,
      display_order: feature.display_order,
      is_active: feature.is_active,
    });
    setEditingId(feature.id);
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateFeature.mutate(
        { id: editingId, ...formData },
        { onSuccess: resetForm }
      );
    } else {
      createFeature.mutate(formData, { onSuccess: resetForm });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteFeature.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as any;
    return IconComponent || Icons.Circle;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Room Features</h1>
        <p className="text-muted-foreground">Manage room features that can be assigned to rooms</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit" : "Add"} Room Feature</CardTitle>
          <CardDescription>
            Create custom features that can be displayed on room cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feature_key">Feature Key*</Label>
                <Input
                  id="feature_key"
                  value={formData.feature_key}
                  onChange={(e) => setFormData({ ...formData, feature_key: e.target.value })}
                  placeholder="wifi"
                  required
                  disabled={isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (lowercase, no spaces)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="label">Label*</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="WiFi"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon_name">Icon*</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {AVAILABLE_ICONS.map((iconName) => {
                      const Icon = getIconComponent(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{iconName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createFeature.isPending || updateFeature.isPending}>
                {isEditing ? "Update" : "Add"} Feature
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Features List */}
      <div className="grid gap-4">
        {features?.map((feature) => {
          const Icon = getIconComponent(feature.icon_name);
          return (
            <Card key={feature.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <Icon className="h-6 w-6" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{feature.label}</h3>
                        {feature.is_active ? (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Key: {feature.feature_key} | Order: {feature.display_order}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(feature)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(feature.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this room feature. Rooms using this feature will still display it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}












