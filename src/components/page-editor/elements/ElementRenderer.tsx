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
import { CityEventsElement } from "./CityEventsElement";
import { NearbyLocationsElement } from "./NearbyLocationsElement";

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  isPreview?: boolean;
}

export function ElementRenderer({
  element,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  isPreview = false,
}: ElementRendererProps) {
  if (element.isVisible === false && isPreview) return null;

  const commonProps = {
    element,
    isSelected,
    isHovered,
    onSelect: element.isLocked ? () => {} : onSelect,
    onHover,
    isPreview,
  };

  const wrapHidden = (node: React.ReactNode) => {
    if (element.isVisible === false && !isPreview) {
      return <div className="opacity-30 pointer-events-auto">{node}</div>;
    }
    return node;
  };

  let rendered: React.ReactNode;

  switch (element.type) {
    case "heading":
      rendered = <HeadingElement {...commonProps} />; break;
    case "paragraph":
      rendered = <ParagraphElement {...commonProps} />; break;
    case "image":
      rendered = <ImageElement {...commonProps} />; break;
    case "button":
      rendered = <ButtonElement {...commonProps} />; break;
    case "spacer":
      rendered = <SpacerElement {...commonProps} />; break;
    case "divider":
      rendered = <DividerElement {...commonProps} />; break;
    case "section":
      rendered = <SectionElement {...commonProps} />; break;
    case "container":
      rendered = <ContainerElement {...commonProps} />; break;
    case "gallery":
      rendered = <GalleryElement {...commonProps} />; break;
    case "html":
      rendered = <HtmlElement {...commonProps} />; break;
    case "video":
      rendered = <VideoElement {...commonProps} />; break;
    case "icon":
      rendered = <IconElement {...commonProps} />; break;
    case "social-links":
      rendered = <SocialLinksElement {...commonProps} />; break;
    case "whatsapp-button":
      rendered = <WhatsAppButtonElement {...commonProps} />; break;
    case "map-embed":
      rendered = <MapEmbedElement {...commonProps} />; break;
    case "hero-slider":
      rendered = <HeroSliderElement {...commonProps} />; break;
    case "room-slider":
      rendered = <RoomSliderElement {...commonProps} />; break;
    case "facilities":
      rendered = <FacilitiesElement {...commonProps} />; break;
    case "city-events":
      rendered = <CityEventsElement {...commonProps} />; break;
    case "nearby-locations":
      rendered = <NearbyLocationsElement {...commonProps} />; break;
    default:
      rendered = (
        <div className="p-4 bg-destructive/10 text-destructive rounded">
          Unknown element type: {element.type}
        </div>
      );
  }

  return wrapHidden(rendered);
}
