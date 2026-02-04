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
  const commonProps = {
    element,
    isSelected,
    isHovered,
    onSelect,
    onHover,
    isPreview,
  };

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
    default:
      return (
        <div className="p-4 bg-destructive/10 text-destructive rounded">
          Unknown element type: {element.type}
        </div>
      );
  }
}
