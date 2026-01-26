import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useContext } from "react";
import { EditorModeContext } from "@/contexts/EditorModeContext";
import { EditableText } from "@/components/admin/editor-mode/EditableText";
import { usePublicOverrides } from "@/contexts/PublicOverridesContext";
import { useWidgetStyles } from "@/hooks/useWidgetStyles";
import type { RoomsHeaderProps } from "./types";
export const RoomsHeader = ({
  checkIn,
  checkOut,
  totalNights
}: RoomsHeaderProps) => {
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? false;
  const {
    getElementStyles
  } = usePublicOverrides();
  const {
    settings,
    lineStyle
  } = useWidgetStyles('rooms');

  // Get title from settings or use default
  const title = settings.title_override || "Our Accommodations";
  const subtitle = settings.subtitle_override || "Pilih tanggal check-in dan check-out untuk melihat ketersediaan kamar";
  return <div className="text-center mb-12 sm:mb-16 animate-slide-up">
      {isEditorMode ? <EditableText widgetId="rooms" field="title" value={title} as="h2" className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-semibold text-foreground mb-4 sm:mb-6 px-2" /> : <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 sm:mb-6 px-2 text-primary font-sans lg:text-3xl" style={getElementStyles('rooms-title')}>
          {title}
        </h2>}
      
      {/* Line/Divider with widget styling */}
      <div className="h-1 mx-auto mb-4 sm:mb-6 bg-primary border" style={{
      width: lineStyle.width || '96px',
      height: lineStyle.height || '4px',
      backgroundColor: lineStyle.backgroundColor || undefined
    }} />
      
      {checkIn && checkOut ? isEditorMode ? <EditableText widgetId="rooms" field="subtitle_dates" value={`Mencari kamar untuk: ${format(checkIn, "dd MMM yyyy", {
      locale: localeId
    })} - ${format(checkOut, "dd MMM yyyy", {
      locale: localeId
    })} (${totalNights} malam)`} as="p" className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" /> : <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" style={getElementStyles('rooms-subtitle-dates')}>
            Mencari kamar untuk: {format(checkIn, "dd MMM yyyy", {
        locale: localeId
      })} - {format(checkOut, "dd MMM yyyy", {
        locale: localeId
      })} ({totalNights} malam)
          </p> : isEditorMode ? <EditableText widgetId="rooms" field="subtitle" value={subtitle} as="p" className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" /> : <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4" style={getElementStyles('rooms-subtitle')}>
            {subtitle}
          </p>}
    </div>;
};