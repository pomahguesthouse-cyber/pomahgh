import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContext } from "react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";
import type { RoomRelatedRoomsProps } from "./types";
export const RoomRelatedRooms = ({
  rooms
}: RoomRelatedRoomsProps) => {
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? false;
  const {
    getElementStyles
  } = usePublicOverrides();
  if (rooms.length === 0) return null;
  return <div className="mt-16">
      {isEditorMode ? <EditableText widgetId="related-rooms" field="title" value="Other Rooms You May Like" as="h2" className="text-3xl font-bold mb-8 text-center" /> : <h2 className="font-bold mb-8 text-center text-lg" style={getElementStyles('related-rooms-title')}>​Kamar Lainnya Yang Mungkin Anda Suka</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {rooms.map(relatedRoom => <Card key={relatedRoom.id} className="overflow-hidden hover:shadow-xl transition-shadow">
            <img src={relatedRoom.image_url} alt={relatedRoom.name} className="w-full h-48 object-cover" />
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-2">{relatedRoom.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {relatedRoom.description}
              </p>
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-primary">
                  Rp {(relatedRoom.final_price || relatedRoom.price_per_night).toLocaleString("id-ID")}
                </p>
                <Button variant="outline" size="sm" onClick={() => {
              const slug = relatedRoom.slug || relatedRoom.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              window.location.href = `/rooms/${slug}`;
            }}>
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};