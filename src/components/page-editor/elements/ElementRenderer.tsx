import { memo, useMemo, useCallback } from "react";
import { EditorElement } from "@/stores/editorStore";
import { HeadingElement } from "./HeadingElement";
import { ParagraphElement } from "./ParagraphElement";
import { ImageElement } from "./ImageElement";
import { ButtonElement } from "./ButtonElement";
import { SpacerElement } from "./SpacerElement";
import { DividerElement } from "./DividerElement";
import { SectionElement } from "./SectionElement";
import { ContainerElement } from "./ContainerElement";
import { GalleryElement } from "./GalleryElement";
import { HtmlElement } from "./HtmlElement";
import { VideoElement } from "./VideoElement";
import { IconElement } from "./IconElement";
import { SocialLinksElement } from "./SocialLinksElement";
import { WhatsAppButtonElement } from "./WhatsAppButtonElement";
import { MapEmbedElement } from "./MapEmbedElement";
import { HeroSliderElement } from "./HeroSliderElement";
import { RoomSliderElement } from "./RoomSliderElement";
import { FacilitiesElement } from "./FacilitiesElement";
import { NearbyLocationsElement } from "./NearbyLocationsElement";
import { PageSliderElement } from "./PageSliderElement";

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

// Memoized component to prevent unnecessary re-renders
export const ElementRenderer = memo(function ElementRenderer({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ElementRendererProps) {
  if (element.isVisible === false && isPreview) return null;

  // Memoize common props to prevent creating new objects on each render
  const commonProps = useMemo(() => ({
    element,
    isSelected,
    isHovered,
    onSelect: element.isLocked ? () => {} : onSelect,
    onHover,
    isPreview,
  }), [element, isSelected, isHovered, onSelect, onHover, isPreview, element.isLocked]);

  const wrapHidden = useCallback((node: React.ReactNode) => {
    if (element.isVisible === false && !isPreview) {
      return <div className="opacity-30 pointer-events-auto">{node}</div>;
    }
    return node;
  }, [element.isVisible, isPreview]);

  const rendered = useMemo(() => {
    switch (element.type) {
      case "heading":
        return <HeadingElement {...commonProps} />;
      case "paragraph":
        return <ParagraphElement {...commonProps} />;
      case "image":
        return <ImageElement {...commonProps} />;
      case "button":
        return <ButtonElement {...commonProps} />;
      case "spacer":
        return <SpacerElement {...commonProps} />;
      case "divider":
        return <DividerElement {...commonProps} />;
      case "section":
        return <SectionElement {...commonProps} />;
      case "container":
        return <ContainerElement {...commonProps} />;
      case "gallery":
        return <GalleryElement {...commonProps} />;
      case "html":
        return <HtmlElement {...commonProps} />;
      case "video":
        return <VideoElement {...commonProps} />;
      case "icon":
        return <IconElement {...commonProps} />;
      case "social-links":
        return <SocialLinksElement {...commonProps} />;
      case "whatsapp-button":
        return <WhatsAppButtonElement {...commonProps} />;
      case "map-embed":
        return <MapEmbedElement {...commonProps} />;
      case "hero-slider":
        return <HeroSliderElement {...commonProps} />;
      case "room-slider":
        return <RoomSliderElement {...commonProps} />;
      case "facilities":
        return <FacilitiesElement {...commonProps} />;
      case "page-slider":
        return <PageSliderElement {...commonProps} />;
      case "nearby-locations":
        return <NearbyLocationsElement {...commonProps} />;
      default:
        return (
          <div className="p-4 bg-destructive/10 text-destructive rounded">
            Unknown element type: {element.type}
          </div>
        );
    }
  }, [element.type, commonProps]);

  return wrapHidden(rendered);
});
