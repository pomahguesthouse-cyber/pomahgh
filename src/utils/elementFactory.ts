import { EditorElement, ElementPosition } from "@/stores/editorStore";

export interface ElementFactoryOptions {
  overrideProps?: Record<string, unknown>;
  overrideStyles?: Record<string, unknown>;
  position?: Partial<ElementPosition>;
}

const HERO_SLIDES_DEFAULT = [
  {
    id: "slide-1",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920",
    headline: "Welcome to Our Hotel",
    subheadline: "Experience luxury and comfort",
    ctaText: "Book Now",
    ctaUrl: "#booking",
  },
  {
    id: "slide-2",
    imageUrl: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1920",
    headline: "Your Perfect Getaway",
    subheadline: "Discover paradise",
    ctaText: "View Rooms",
    ctaUrl: "#rooms",
  },
];

const getDefaultPropsForType = (type: string): Record<string, unknown> => {
  switch (type) {
    case "heading":
      return { level: "h2", content: "New Heading" };
    case "paragraph":
      return { content: "Add your text here..." };
    case "image":
      return { src: "", alt: "Image" };
    case "button":
      return { label: "Click Me", url: "#", variant: "default" };
    case "gallery":
      return { images: [], galleryMode: "grid" };
    case "html":
      return { html: "" };
    case "video":
      return { videoUrl: "" };
    case "icon":
      return { iconName: "Star", iconSize: 48, iconColor: "#0f172a" };
    case "social-links":
      return {
        links: [
          { platform: "instagram", url: "#" },
          { platform: "facebook", url: "#" },
          { platform: "twitter", url: "#" },
        ],
        iconSize: 24,
        iconColor: "#64748b",
      };
    case "whatsapp-button":
      return {
        phoneNumber: "",
        message: "Halo, saya ingin bertanya...",
        label: "Chat via WhatsApp",
      };
    case "map-embed":
      return { embedUrl: "" };
    case "room-slider":
      return {
        title: "Pilihan Kamar",
        visibleCards: 3,
        autoPlay: true,
        showPrice: true,
        ctaText: "Lihat Detail",
      };
    case "facilities":
      return { title: "Fasilitas Hotel", columns: 3, layout: "card" };
    case "nearby-locations":
      return { title: "Lokasi Terdekat", columns: 2, layout: "list" };
    case "news-events":
      return {
        title: "Berita & Agenda",
        subtitle: "",
        sourceType: "all",
        selectedEventIds: [],
        category: "",
        layout: "slider",
        maxItems: 6,
      };
    case "hero-slider":
      return {
        height: "500px",
        autoPlay: true,
        autoPlayInterval: 5000,
        showArrows: true,
        showDots: true,
        overlayColor: "rgba(0,0,0,0.5)",
        headingColor: "#ffffff",
        subheadingColor: "#e0e0e0",
        ctaBgColor: "#e11d48",
        slides: HERO_SLIDES_DEFAULT,
      };
    default:
      return {};
  }
};

const getDefaultStylesForType = (type: string): Record<string, unknown> => {
  switch (type) {
    case "image":
      return { width: "100%" };
    case "spacer":
      return { minHeight: "40px" };
    case "divider":
      return { marginTop: "16px", marginBottom: "16px" };
    case "section":
      return { paddingTop: "40px", paddingBottom: "40px" };
    case "container":
      return { gap: "16px" };
    case "gallery":
      return { columns: 3, gap: "16px" };
    case "video":
      return { width: "100%" };
    case "icon":
      return { textAlign: "center" };
    case "social-links":
      return { textAlign: "center" };
    case "whatsapp-button":
      return { textAlign: "center" };
    case "map-embed":
      return { width: "100%", minHeight: "400px" };
    case "hero-slider":
      return { textAlign: "center" };
    default:
      return {};
  }
};

const getChildrenForType = (type: string): EditorElement[] | undefined => {
  if (type === "section" || type === "container") {
    return [];
  }
  return undefined;
};

export function createElement(
  type: string,
  options?: ElementFactoryOptions
): EditorElement {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const defaultProps = getDefaultPropsForType(type);
  const defaultStyles = getDefaultStylesForType(type);
  const children = getChildrenForType(type);

  const element: EditorElement = {
    id,
    type: type as EditorElement["type"],
    props: { ...defaultProps, ...options?.overrideProps },
    styles: { ...defaultStyles, ...options?.overrideStyles },
    position: {
      x: 0,
      y: 0,
      width: 200,
      height: 50,
      rotation: 0,
      zIndex: 0,
      ...options?.position,
    },
  };

  if (children) {
    element.children = children;
  }

  return element;
}

export const ELEMENT_TYPES = [
  "heading",
  "paragraph",
  "image",
  "button",
  "spacer",
  "divider",
  "section",
  "container",
  "gallery",
  "html",
  "video",
  "icon",
  "social-links",
  "whatsapp-button",
  "map-embed",
  "hero-slider",
  "room-slider",
  "facilities",
  "news-events",
  "nearby-locations",
] as const;

export type SupportedElementType = typeof ELEMENT_TYPES[number];
