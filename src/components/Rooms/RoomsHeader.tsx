import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useContext } from "react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";
import type { RoomsHeaderProps } from "./types";

export const RoomsHeader = ({ checkIn, checkOut, totalNights }: RoomsHeaderProps) => {
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? false;
  const { getElementStyles } = usePublicOverrides();

  return (
    <div className="text-center mb-12 sm:mb-16 animate-slide-up">
      {isEditorMode ? (
        <EditableText
          widgetId="rooms"
          field="title"
          value="Our Accommodations"
          as="h2"
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-semibold text-foreground mb-4 sm:mb-6 px-2"
        />
      ) : (
        <h2 
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-semibold text-foreground mb-4 sm:mb-6 px-2"
          style={getElementStyles('rooms-title')}
        >
          Our Accommodations
        </h2>
      )}
      <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-4 sm:mb-6"></div>
      {checkIn && checkOut ? (
        isEditorMode ? (
          <EditableText
            widgetId="rooms"
            field="subtitle-dates"
            value={`Mencari kamar untuk: ${format(checkIn, "dd MMM yyyy", { locale: localeId })} - ${format(checkOut, "dd MMM yyyy", { locale: localeId })} (${totalNights} malam)`}
            as="p"
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
          />
        ) : (
          <p 
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
            style={getElementStyles('rooms-subtitle-dates')}
          >
            Mencari kamar untuk: {format(checkIn, "dd MMM yyyy", { locale: localeId })} - {format(checkOut, "dd MMM yyyy", { locale: localeId })} ({totalNights} malam)
          </p>
        )
      ) : (
        isEditorMode ? (
          <EditableText
            widgetId="rooms"
            field="subtitle"
            value="Pilih tanggal check-in dan check-out untuk melihat ketersediaan kamar"
            as="p"
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
          />
        ) : (
          <p 
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4"
            style={getElementStyles('rooms-subtitle')}
          >
            Pilih tanggal check-in dan check-out untuk melihat ketersediaan kamar
          </p>
        )
      )}
    </div>
  );
};
