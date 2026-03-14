import { SectionTemplate } from "./templateRegistry";

const uid = () => `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const contentTemplates: SectionTemplate[] = [
  {
    id: "features-3col",
    name: "Features 3-Column",
    category: "content",
    icon: "📊",
    description: "Three feature cards with icons and descriptions",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#ffffff" },
      children: [
        {
          id: uid(),
          type: "heading",
          props: { level: "h2", content: "Why Choose Us" },
          styles: { fontSize: "36px", fontWeight: "bold", color: "#0f172a", textAlign: "center", marginBottom: "48px" },
        },
        {
          id: uid(),
          type: "container",
          props: { direction: "row" },
          styles: { gap: "32px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#f8fafc", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "🏨 Premium Rooms" }, styles: { fontSize: "24px", fontWeight: "semibold", textAlign: "center", marginBottom: "12px" } },
                { id: uid(), type: "paragraph", props: { content: "Spacious rooms with modern amenities, premium bedding, and stunning city views." }, styles: { fontSize: "15px", color: "#64748b", textAlign: "center" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#f8fafc", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "🍽️ Fine Dining" }, styles: { fontSize: "24px", fontWeight: "semibold", textAlign: "center", marginBottom: "12px" } },
                { id: uid(), type: "paragraph", props: { content: "World-class restaurant serving local and international cuisine prepared by award-winning chefs." }, styles: { fontSize: "15px", color: "#64748b", textAlign: "center" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#f8fafc", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "🏊 Pool & Spa" }, styles: { fontSize: "24px", fontWeight: "semibold", textAlign: "center", marginBottom: "12px" } },
                { id: uid(), type: "paragraph", props: { content: "Relax at our infinity pool or rejuvenate with our full-service spa treatments." }, styles: { fontSize: "15px", color: "#64748b", textAlign: "center" } },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: "about-image-text",
    name: "About Image + Text",
    category: "content",
    icon: "📖",
    description: "Two-column layout with image and text side by side",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#ffffff" },
      children: [
        {
          id: uid(),
          type: "container",
          props: { direction: "row" },
          styles: { gap: "48px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(), type: "image",
              props: { src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop", alt: "Hotel exterior" },
              styles: { width: "100%", borderRadius: "12px" },
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { paddingTop: "20px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px", gap: "16px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h2", content: "About Our Hotel" }, styles: { fontSize: "32px", fontWeight: "bold", color: "#0f172a" } },
                { id: uid(), type: "paragraph", props: { content: "Nestled in the heart of the city, our hotel offers a perfect blend of luxury and comfort. With decades of hospitality experience, we pride ourselves on delivering exceptional service to every guest." }, styles: { fontSize: "16px", color: "#475569" } },
                { id: uid(), type: "paragraph", props: { content: "From our thoughtfully designed rooms to our world-class amenities, every detail has been carefully curated to ensure your stay is nothing short of extraordinary." }, styles: { fontSize: "16px", color: "#475569" } },
                { id: uid(), type: "button", props: { label: "Learn More", url: "#about", variant: "outline" }, styles: { textAlign: "left" } },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: "testimonials-grid",
    name: "Testimonials Grid",
    category: "content",
    icon: "💬",
    description: "Three testimonial cards with quotes",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#f8fafc" },
      children: [
        { id: uid(), type: "heading", props: { level: "h2", content: "What Our Guests Say" }, styles: { fontSize: "36px", fontWeight: "bold", textAlign: "center", marginBottom: "48px", color: "#0f172a" } },
        {
          id: uid(), type: "container", props: { direction: "row" },
          styles: { gap: "24px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#ffffff", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", gap: "12px" },
              children: [
                { id: uid(), type: "paragraph", props: { content: '"An absolutely wonderful stay! The staff went above and beyond to make our anniversary special."' }, styles: { fontSize: "15px", color: "#334155" } },
                { id: uid(), type: "paragraph", props: { content: "— Sarah & John" }, styles: { fontSize: "14px", fontWeight: "semibold", color: "#0f172a" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#ffffff", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", gap: "12px" },
              children: [
                { id: uid(), type: "paragraph", props: { content: '"Best hotel experience in the city. The rooms are impeccable and the location is perfect."' }, styles: { fontSize: "15px", color: "#334155" } },
                { id: uid(), type: "paragraph", props: { content: "— Michael T." }, styles: { fontSize: "14px", fontWeight: "semibold", color: "#0f172a" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#ffffff", paddingTop: "28px", paddingBottom: "28px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", gap: "12px" },
              children: [
                { id: uid(), type: "paragraph", props: { content: '"We will definitely be coming back. The breakfast was outstanding and the pool area is heavenly."' }, styles: { fontSize: "15px", color: "#334155" } },
                { id: uid(), type: "paragraph", props: { content: "— Amanda R." }, styles: { fontSize: "14px", fontWeight: "semibold", color: "#0f172a" } },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: "cta-banner",
    name: "CTA Banner",
    category: "content",
    icon: "📢",
    description: "Full-width call-to-action banner",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#1e40af", textAlign: "center" },
      children: [
        { id: uid(), type: "heading", props: { level: "h2", content: "Ready to Book Your Stay?" }, styles: { fontSize: "36px", fontWeight: "bold", color: "#ffffff", textAlign: "center", marginBottom: "16px" } },
        { id: uid(), type: "paragraph", props: { content: "Get the best rates when you book directly. Special offers available for a limited time." }, styles: { fontSize: "18px", color: "#bfdbfe", textAlign: "center", marginBottom: "32px" } },
        { id: uid(), type: "button", props: { label: "Book Direct & Save", url: "#booking", variant: "secondary" }, styles: { textAlign: "center" } },
      ],
    }),
  },
  {
    id: "pricing-3col",
    name: "Pricing 3-Column",
    category: "content",
    icon: "💰",
    description: "Three pricing cards with feature lists",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#ffffff" },
      children: [
        { id: uid(), type: "heading", props: { level: "h2", content: "Our Room Rates" }, styles: { fontSize: "36px", fontWeight: "bold", textAlign: "center", marginBottom: "48px", color: "#0f172a" } },
        {
          id: uid(), type: "container", props: { direction: "row" },
          styles: { gap: "24px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "0px", paddingRight: "0px" },
          children: [
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#f8fafc", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center", gap: "8px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "Standard" }, styles: { fontSize: "20px", fontWeight: "semibold", textAlign: "center" } },
                { id: uid(), type: "heading", props: { level: "h2", content: "Rp 500.000" }, styles: { fontSize: "32px", fontWeight: "bold", textAlign: "center", color: "#1e40af" } },
                { id: uid(), type: "paragraph", props: { content: "per night" }, styles: { fontSize: "14px", color: "#64748b", textAlign: "center", marginBottom: "16px" } },
                { id: uid(), type: "paragraph", props: { content: "✓ Free WiFi\n✓ Air Conditioning\n✓ Daily Housekeeping\n✓ Breakfast Included" }, styles: { fontSize: "14px", color: "#475569", textAlign: "left" } },
                { id: uid(), type: "button", props: { label: "Select", url: "#book-standard", variant: "outline" }, styles: { textAlign: "center", marginTop: "16px" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#1e40af", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center", gap: "8px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "Deluxe" }, styles: { fontSize: "20px", fontWeight: "semibold", textAlign: "center", color: "#ffffff" } },
                { id: uid(), type: "heading", props: { level: "h2", content: "Rp 800.000" }, styles: { fontSize: "32px", fontWeight: "bold", textAlign: "center", color: "#ffffff" } },
                { id: uid(), type: "paragraph", props: { content: "per night" }, styles: { fontSize: "14px", color: "#bfdbfe", textAlign: "center", marginBottom: "16px" } },
                { id: uid(), type: "paragraph", props: { content: "✓ Everything in Standard\n✓ City View\n✓ Mini Bar\n✓ Late Checkout\n✓ Room Service" }, styles: { fontSize: "14px", color: "#e2e8f0", textAlign: "left" } },
                { id: uid(), type: "button", props: { label: "Select", url: "#book-deluxe", variant: "secondary" }, styles: { textAlign: "center", marginTop: "16px" } },
              ],
            },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { backgroundColor: "#f8fafc", paddingTop: "32px", paddingBottom: "32px", paddingLeft: "24px", paddingRight: "24px", borderRadius: "12px", textAlign: "center", gap: "8px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h3", content: "Suite" }, styles: { fontSize: "20px", fontWeight: "semibold", textAlign: "center" } },
                { id: uid(), type: "heading", props: { level: "h2", content: "Rp 1.500.000" }, styles: { fontSize: "32px", fontWeight: "bold", textAlign: "center", color: "#1e40af" } },
                { id: uid(), type: "paragraph", props: { content: "per night" }, styles: { fontSize: "14px", color: "#64748b", textAlign: "center", marginBottom: "16px" } },
                { id: uid(), type: "paragraph", props: { content: "✓ Everything in Deluxe\n✓ Living Room\n✓ Jacuzzi\n✓ Airport Transfer\n✓ Personal Butler" }, styles: { fontSize: "14px", color: "#475569", textAlign: "left" } },
                { id: uid(), type: "button", props: { label: "Select", url: "#book-suite", variant: "outline" }, styles: { textAlign: "center", marginTop: "16px" } },
              ],
            },
          ],
        },
      ],
    }),
  },
  {
    id: "faq-section",
    name: "FAQ Section",
    category: "content",
    icon: "❓",
    description: "Frequently asked questions list",
    create: () => ({
      id: uid(),
      type: "section",
      props: {},
      styles: { paddingTop: "60px", paddingBottom: "60px", paddingLeft: "40px", paddingRight: "40px", backgroundColor: "#ffffff" },
      children: [
        { id: uid(), type: "heading", props: { level: "h2", content: "Frequently Asked Questions" }, styles: { fontSize: "36px", fontWeight: "bold", textAlign: "center", marginBottom: "48px", color: "#0f172a" } },
        {
          id: uid(), type: "container", props: { direction: "column" },
          styles: { gap: "24px", paddingTop: "0px", paddingBottom: "0px", paddingLeft: "40px", paddingRight: "40px" },
          children: [
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "What time is check-in and check-out?" }, styles: { fontWeight: "semibold", color: "#0f172a" } },
                { id: uid(), type: "paragraph", props: { content: "Check-in is at 2:00 PM and check-out is at 12:00 PM. Early check-in and late check-out are available upon request and subject to availability." }, styles: { color: "#64748b", fontSize: "15px" } },
              ],
            },
            { id: uid(), type: "divider", props: {}, styles: { marginTop: "0px", marginBottom: "0px" } },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Is breakfast included?" }, styles: { fontWeight: "semibold", color: "#0f172a" } },
                { id: uid(), type: "paragraph", props: { content: "Yes, all room rates include a complimentary breakfast buffet served from 7:00 AM to 10:00 AM in our main restaurant." }, styles: { color: "#64748b", fontSize: "15px" } },
              ],
            },
            { id: uid(), type: "divider", props: {}, styles: { marginTop: "0px", marginBottom: "0px" } },
            {
              id: uid(), type: "container", props: { direction: "column" },
              styles: { gap: "8px", paddingTop: "16px", paddingBottom: "16px", paddingLeft: "0px", paddingRight: "0px" },
              children: [
                { id: uid(), type: "heading", props: { level: "h4", content: "Do you offer airport transfers?" }, styles: { fontWeight: "semibold", color: "#0f172a" } },
                { id: uid(), type: "paragraph", props: { content: "Yes, we provide airport shuttle service for our guests. Please contact our reception 24 hours in advance to arrange your transfer." }, styles: { color: "#64748b", fontSize: "15px" } },
              ],
            },
          ],
        },
      ],
    }),
  },
];
