import { SectionTemplate } from "./templateRegistry";

const uid = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const heroTemplates: SectionTemplate[] = [
  {
    id: "hero-image-cta",
    name: "Hero Image + CTA",
    category: "hero",
    icon: "🖼️",
    description: "Full-width background with headline and CTA button",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: {
        paddingTop: "80px",
        paddingBottom: "80px",
        paddingLeft: "40px",
        paddingRight: "40px",
        backgroundColor: "#1a1a2e",
        minHeight: "500px",
        textAlign: "center",
      },
      children: [
        {
          id: uid(),
          type: "heading",
          props: { level: "h1", content: "Welcome to Our Hotel" },
          styles: { fontSize: "48px", fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: "16px" },
        },
        {
          id: uid(),
          type: "paragraph",
          props: { content: "Experience luxury and comfort in the heart of the city. Book your stay today and enjoy world-class amenities." },
          styles: { fontSize: "18px", color: "#cccccc", textAlign: "center", marginBottom: "32px" },
        },
        {
          id: uid(),
          type: "button",
          props: { label: "Book Now", url: "#booking", variant: "default" },
          styles: { textAlign: "center" },
        },
      ],
    }),
  },
  {
    id: "hero-centered-dual",
    name: "Hero Centered + Dual Buttons",
    category: "hero",
    icon: "✨",
    description: "Centered text with primary and outline buttons",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: {
        paddingTop: "100px",
        paddingBottom: "100px",
        paddingLeft: "40px",
        paddingRight: "40px",
        backgroundColor: "#0f172a",
        minHeight: "600px",
        textAlign: "center",
      },
      children: [
        {
          id: uid(),
          type: "heading",
          props: { level: "h1", content: "Your Perfect Getaway Awaits" },
          styles: { fontSize: "56px", fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: "24px" },
        },
        {
          id: uid(),
          type: "paragraph",
          props: { content: "Discover our collection of premium rooms, each designed to provide the ultimate relaxation experience." },
          styles: { fontSize: "20px", color: "#94a3b8", textAlign: "center", marginBottom: "40px" },
        },
        {
          id: uid(),
          type: "container",
          props: { direction: "row" },
          styles: { gap: "16px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(),
              type: "button",
              props: { label: "Reserve Now", url: "#booking", variant: "default" },
              styles: { textAlign: "center" },
            },
            {
              id: uid(),
              type: "button",
              props: { label: "View Rooms", url: "#rooms", variant: "outline" },
              styles: { textAlign: "center" },
            },
          ],
        },
      ],
    }),
  },
  {
    id: "hero-minimal",
    name: "Hero Minimal",
    category: "hero",
    icon: "🎯",
    description: "Clean minimal hero with large typography",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: {
        paddingTop: "120px",
        paddingBottom: "120px",
        paddingLeft: "60px",
        paddingRight: "60px",
        backgroundColor: "#ffffff",
        minHeight: "500px",
      },
      children: [
        {
          id: uid(),
          type: "heading",
          props: { level: "h1", content: "Stay Different." },
          styles: { fontSize: "72px", fontWeight: "bold", color: "#0f172a", textAlign: "left", marginBottom: "24px" },
        },
        {
          id: uid(),
          type: "paragraph",
          props: { content: "A boutique hotel experience designed for the modern traveler." },
          styles: { fontSize: "22px", color: "#64748b", textAlign: "left", marginBottom: "40px" },
        },
        {
          id: uid(),
          type: "button",
          props: { label: "Explore →", url: "#explore", variant: "default" },
          styles: { textAlign: "left" },
        },
      ],
    }),
  },
];
