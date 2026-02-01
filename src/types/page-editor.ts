// Page Editor Types - Wix-like visual editor data model

export type ComponentType = 
  // Layout
  | 'section'
  | 'container'
  | 'grid-2'
  | 'grid-3'
  // Content
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'icon'
  | 'divider'
  // Marketing
  | 'cta-button'
  | 'feature-list'
  | 'testimonial'
  | 'gallery'
  // SEO Blocks
  | 'hero-section'
  | 'seo-content'
  | 'faq';

export interface ComponentStyles {
  margin?: string;
  padding?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  borderRadius?: string;
  width?: string;
  maxWidth?: string;
}

export interface ComponentSEO {
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4';
  altText?: string;
  keywordHint?: string;
}

export interface ComponentContent {
  text?: string;
  html?: string;
  src?: string;
  href?: string;
  items?: Array<{ title: string; description: string; icon?: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  testimonials?: Array<{ name: string; text: string; rating?: number }>;
  images?: Array<{ src: string; alt: string }>;
  whatsappNumber?: string;
  whatsappMessage?: string;
  buttonText?: string;
  buttonStyle?: 'primary' | 'secondary' | 'outline' | 'whatsapp';
}

export interface PageComponent {
  id: string;
  type: ComponentType;
  content: ComponentContent;
  styles: ComponentStyles;
  seo: ComponentSEO;
  children?: PageComponent[];
}

export interface PageSection {
  id: string;
  name: string;
  components: PageComponent[];
  styles: ComponentStyles;
}

export interface PageSchema {
  sections: PageSection[];
  settings?: {
    maxWidth?: string;
    backgroundColor?: string;
  };
}

export interface EditorState {
  selectedComponentId: string | null;
  selectedSectionId: string | null;
  isDragging: boolean;
  history: PageSchema[];
  historyIndex: number;
  zoom: number;
  device: 'desktop' | 'tablet' | 'mobile';
}

export interface DraggableComponent {
  type: ComponentType;
  label: string;
  icon: string;
  category: 'layout' | 'content' | 'marketing' | 'seo';
  defaultContent: ComponentContent;
  defaultStyles: ComponentStyles;
  defaultSEO: ComponentSEO;
}

// Component palette definition
export const COMPONENT_PALETTE: DraggableComponent[] = [
  // Layout
  {
    type: 'section',
    label: 'Section',
    icon: 'LayoutTemplate',
    category: 'layout',
    defaultContent: {},
    defaultStyles: { padding: '40px 20px' },
    defaultSEO: {},
  },
  {
    type: 'container',
    label: 'Container',
    icon: 'Square',
    category: 'layout',
    defaultContent: {},
    defaultStyles: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
    defaultSEO: {},
  },
  {
    type: 'grid-2',
    label: 'Grid 2 Kolom',
    icon: 'Columns2',
    category: 'layout',
    defaultContent: {},
    defaultStyles: {},
    defaultSEO: {},
  },
  {
    type: 'grid-3',
    label: 'Grid 3 Kolom',
    icon: 'Columns3',
    category: 'layout',
    defaultContent: {},
    defaultStyles: {},
    defaultSEO: {},
  },
  // Content
  {
    type: 'heading',
    label: 'Heading',
    icon: 'Heading',
    category: 'content',
    defaultContent: { text: 'Judul Baru' },
    defaultStyles: { fontSize: '2rem', fontWeight: '700' },
    defaultSEO: { headingLevel: 'h2' },
  },
  {
    type: 'paragraph',
    label: 'Paragraf',
    icon: 'AlignLeft',
    category: 'content',
    defaultContent: { text: 'Masukkan teks di sini...' },
    defaultStyles: { fontSize: '1rem' },
    defaultSEO: {},
  },
  {
    type: 'image',
    label: 'Gambar',
    icon: 'Image',
    category: 'content',
    defaultContent: { src: '' },
    defaultStyles: { width: '100%', borderRadius: '8px' },
    defaultSEO: { altText: '' },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: 'Minus',
    category: 'content',
    defaultContent: {},
    defaultStyles: { margin: '20px 0' },
    defaultSEO: {},
  },
  // Marketing
  {
    type: 'cta-button',
    label: 'Tombol CTA',
    icon: 'MousePointerClick',
    category: 'marketing',
    defaultContent: { 
      buttonText: 'Booking via WhatsApp',
      whatsappNumber: '',
      whatsappMessage: 'Halo, saya tertarik untuk booking...',
      buttonStyle: 'whatsapp'
    },
    defaultStyles: { textAlign: 'center', padding: '20px 0' },
    defaultSEO: {},
  },
  {
    type: 'feature-list',
    label: 'Fitur List',
    icon: 'List',
    category: 'marketing',
    defaultContent: { 
      items: [
        { title: 'Lokasi Strategis', description: 'Dekat dengan kampus dan pusat kota', icon: 'MapPin' },
        { title: 'Harga Terjangkau', description: 'Harga bersahabat untuk semua kalangan', icon: 'Wallet' },
      ]
    },
    defaultStyles: {},
    defaultSEO: {},
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: 'Quote',
    category: 'marketing',
    defaultContent: { 
      testimonials: [
        { name: 'Budi S.', text: 'Penginapan yang nyaman dan bersih!', rating: 5 }
      ]
    },
    defaultStyles: {},
    defaultSEO: {},
  },
  {
    type: 'gallery',
    label: 'Galeri',
    icon: 'Images',
    category: 'marketing',
    defaultContent: { images: [] },
    defaultStyles: {},
    defaultSEO: {},
  },
  // SEO Blocks
  {
    type: 'hero-section',
    label: 'Hero Section',
    icon: 'Sparkles',
    category: 'seo',
    defaultContent: { 
      text: 'Penginapan Nyaman di Semarang',
      html: 'Lokasi strategis, harga terjangkau, fasilitas lengkap',
      buttonText: 'Booking Sekarang',
      buttonStyle: 'whatsapp'
    },
    defaultStyles: { 
      padding: '80px 20px',
      textAlign: 'center',
      backgroundColor: 'hsl(var(--primary))'
    },
    defaultSEO: { headingLevel: 'h1' },
  },
  {
    type: 'seo-content',
    label: 'SEO Content Block',
    icon: 'FileText',
    category: 'seo',
    defaultContent: { html: '<p>Konten SEO di sini...</p>' },
    defaultStyles: { padding: '40px 20px' },
    defaultSEO: {},
  },
  {
    type: 'faq',
    label: 'FAQ (Schema)',
    icon: 'HelpCircle',
    category: 'seo',
    defaultContent: { 
      faqs: [
        { question: 'Bagaimana cara booking?', answer: 'Anda bisa booking melalui WhatsApp kami.' }
      ]
    },
    defaultStyles: {},
    defaultSEO: {},
  },
];

export function generateComponentId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
