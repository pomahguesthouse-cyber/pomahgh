import { SectionTemplate } from "./templateRegistry";

const uid = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const footerTemplates: SectionTemplate[] = [
  {
    id: "footer-simple",
    name: "Simple Footer",
    category: "footer",
    icon: "📄",
    description: "Minimal footer with logo and copyright",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "32px", paddingBottom: "32px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#0f172a", textAlign: "center" },
      children: [
        { id: uid(), type: "heading", props: { level: "h3", content: "Pomah Guesthouse" }, styles: { fontSize: "20px", fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: "12px" } },
        { id: uid(), type: "paragraph", props: { content: "© 2026 Pomah Guesthouse. All rights reserved." }, styles: { fontSize: "14px", color: "#94a3b8", textAlign: "center" } },
      ],
    }),
  },
  {
    id: "footer-full",
    name: "Full Footer",
    category: "footer",
    icon: "🔗",
    description: "Multi-column footer with links and social",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "48px", paddingBottom: "32px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#0f172a" },
      children: [
        {
          id: uid(), type: "container", props: { direction: "row" },
          styles: { gap: "48px", paddingTop: "0px", paddingBottom: "32px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "12px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Pomah Guesthouse" }, styles: { fontWeight: "bold", color: "#ffffff", marginBottom: "4px" } },
                { id: uid(), type: "paragraph", props: { content: "Your home away from home. Experience comfort and hospitality like never before." }, styles: { fontSize: "14px", color: "#94a3b8" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Quick Links" }, styles: { fontWeight: "bold", color: "#ffffff", marginBottom: "4px" } },
                { id: uid(), type: "paragraph", props: { content: "Home\nRooms\nFacilities\nGallery\nContact" }, styles: { fontSize: "14px", color: "#94a3b8" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Contact" }, styles: { fontWeight: "bold", color: "#ffffff", marginBottom: "4px" } },
                { id: uid(), type: "paragraph", props: { content: "📍 Jl. Example No. 123\n📞 +62 812-3456-7890\n✉️ info@pomah.com" }, styles: { fontSize: "14px", color: "#94a3b8" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Follow Us" }, styles: { fontWeight: "bold", color: "#ffffff", marginBottom: "4px" } },
                { id: uid(), type: "paragraph", props: { content: "Instagram\nFacebook\nTikTok\nYouTube" }, styles: { fontSize: "14px", color: "#94a3b8" } },
              ],
            },
          ],
        },
        { id: uid(), type: "divider", props: {}, styles: { marginTop: "0px", marginBottom: "0px" } },
        { id: uid(), type: "paragraph", props: { content: "© 2026 Pomah Guesthouse. All rights reserved." }, styles: { fontSize: "13px", color: "#64748b", textAlign: "center", marginTop: "24px" } },
      ],
    }),
  },
];
