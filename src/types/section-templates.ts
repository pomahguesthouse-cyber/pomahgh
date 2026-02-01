// Section Templates - Wix-like pre-built sections with preview thumbnails

import { PageSection, PageComponent, generateComponentId, generateSectionId } from './page-editor';

export interface SectionTemplate {
  id: string;
  name: string;
  category: SectionCategory;
  description: string;
  thumbnail?: string; // URL or gradient placeholder
  previewColor: string; // For placeholder thumbnail
  createSection: () => PageSection;
}

export type SectionCategory = 
  | 'blank'
  | 'welcome'
  | 'about'
  | 'team'
  | 'contact'
  | 'promotion'
  | 'services'
  | 'subscribe'
  | 'testimonials'
  | 'clients'
  | 'store'
  | 'bookings'
  | 'events'
  | 'basic'
  | 'text'
  | 'list';

export const SECTION_CATEGORIES: { key: SectionCategory; label: string; icon: string }[] = [
  { key: 'blank', label: '+ Blank Section', icon: 'Plus' },
  { key: 'welcome', label: 'Welcome', icon: 'Sparkles' },
  { key: 'about', label: 'About', icon: 'Info' },
  { key: 'team', label: 'Team', icon: 'Users' },
  { key: 'contact', label: 'Contact', icon: 'Mail' },
  { key: 'promotion', label: 'Promotion', icon: 'Zap' },
  { key: 'services', label: 'Services', icon: 'Briefcase' },
  { key: 'subscribe', label: 'Subscribe', icon: 'Bell' },
  { key: 'testimonials', label: 'Testimonials', icon: 'Quote' },
  { key: 'clients', label: 'Clients', icon: 'Building' },
  { key: 'store', label: 'Store', icon: 'ShoppingBag' },
  { key: 'bookings', label: 'Bookings', icon: 'Calendar' },
  { key: 'events', label: 'Events', icon: 'CalendarDays' },
  { key: 'basic', label: 'Basic', icon: 'Square' },
  { key: 'text', label: 'Text', icon: 'Type' },
  { key: 'list', label: 'List', icon: 'List' },
];

// Section templates with pre-built components
export const SECTION_TEMPLATES: SectionTemplate[] = [
  // Welcome / Hero sections
  {
    id: 'welcome-hero-1',
    name: 'Welcome',
    category: 'welcome',
    description: 'Hero dengan judul dan CTA',
    previewColor: 'from-blue-100 to-blue-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Hero Welcome',
      styles: { padding: '80px 20px', backgroundColor: 'hsl(var(--primary))' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'WELCOME' },
          styles: { fontSize: '3rem', fontWeight: '700', textAlign: 'center', color: 'white' },
          seo: { headingLevel: 'h1' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Selamat datang di website kami. Temukan penginapan nyaman dan terjangkau.' },
          styles: { textAlign: 'center', color: 'white', maxWidth: '600px', margin: '0 auto' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'cta-button',
          content: { buttonText: 'Book Now', buttonStyle: 'secondary' },
          styles: { textAlign: 'center', padding: '20px 0' },
          seo: {},
        },
      ],
    }),
  },
  {
    id: 'welcome-minimal',
    name: 'Grow Your Vision',
    category: 'welcome',
    description: 'Minimal dengan teks centered',
    previewColor: 'from-gray-100 to-white',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Welcome Minimal',
      styles: { padding: '60px 20px', backgroundColor: '#ffffff' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Grow Your Vision' },
          styles: { fontSize: '2.5rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Make your idea shine with our expert help and beautiful design.' },
          styles: { textAlign: 'center', color: 'hsl(var(--muted-foreground))', maxWidth: '500px', margin: '0 auto' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'cta-button',
          content: { buttonText: 'See More', buttonStyle: 'primary' },
          styles: { textAlign: 'center', padding: '24px 0' },
          seo: {},
        },
      ],
    }),
  },
  {
    id: 'welcome-split',
    name: 'Empower Growth',
    category: 'welcome',
    description: 'Split layout dengan gambar',
    previewColor: 'from-slate-800 to-slate-700',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Welcome Split',
      styles: { padding: '60px 20px', backgroundColor: '#1e293b' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Empower Growth' },
          styles: { fontSize: '2.5rem', fontWeight: '700', color: 'white' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'cta-button',
          content: { buttonText: 'Start Now', buttonStyle: 'whatsapp' },
          styles: { padding: '16px 0' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'image',
          content: { src: '' },
          styles: { width: '100%', borderRadius: '12px' },
          seo: { altText: 'Hero image' },
        },
      ],
    }),
  },
  {
    id: 'welcome-dark',
    name: 'Welcome to Our Site',
    category: 'welcome',
    description: 'Full-width dark hero',
    previewColor: 'from-gray-900 to-gray-800',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Hero Dark',
      styles: { padding: '100px 20px', backgroundColor: '#111827' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Welcome to Our Site' },
          styles: { fontSize: '2.5rem', fontWeight: '700', color: 'white', textAlign: 'center' },
          seo: { headingLevel: 'h1' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Find the perfect stay for your needs' },
          styles: { textAlign: 'center', color: '#9ca3af', maxWidth: '400px', margin: '16px auto' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'cta-button',
          content: { buttonText: 'Explore', buttonStyle: 'secondary' },
          styles: { textAlign: 'center', padding: '24px 0' },
          seo: {},
        },
      ],
    }),
  },

  // About sections
  {
    id: 'about-simple',
    name: 'About Us',
    category: 'about',
    description: 'Tentang dengan teks',
    previewColor: 'from-amber-50 to-orange-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'About Us',
      styles: { padding: '60px 20px', backgroundColor: '#fffbeb' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Tentang Kami' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Pomah Guesthouse adalah penginapan nyaman di jantung kota Semarang. Dengan lokasi strategis dan fasilitas lengkap, kami siap menjadi rumah kedua Anda.' },
          styles: { textAlign: 'center', maxWidth: '700px', margin: '16px auto' },
          seo: {},
        },
      ],
    }),
  },

  // Contact sections
  {
    id: 'contact-cta',
    name: 'Contact CTA',
    category: 'contact',
    description: 'CTA kontak WhatsApp',
    previewColor: 'from-green-100 to-emerald-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Contact CTA',
      styles: { padding: '60px 20px', backgroundColor: '#ecfdf5' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Hubungi Kami' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Ada pertanyaan? Tim kami siap membantu 24/7' },
          styles: { textAlign: 'center', color: 'hsl(var(--muted-foreground))' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'cta-button',
          content: { buttonText: 'Chat WhatsApp', buttonStyle: 'whatsapp', whatsappMessage: 'Halo, saya ingin bertanya...' },
          styles: { textAlign: 'center', padding: '24px 0' },
          seo: {},
        },
      ],
    }),
  },

  // Services / Features
  {
    id: 'services-grid',
    name: 'Our Services',
    category: 'services',
    description: 'Grid layanan dengan icon',
    previewColor: 'from-indigo-50 to-purple-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Services',
      styles: { padding: '60px 20px', backgroundColor: '#eef2ff' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Fasilitas Kami' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'feature-list',
          content: {
            items: [
              { title: 'AC & WiFi Gratis', description: 'Koneksi internet cepat di seluruh area', icon: 'Wifi' },
              { title: 'Parkir Luas', description: 'Area parkir aman untuk mobil & motor', icon: 'Car' },
              { title: 'Dapur Bersama', description: 'Fasilitas memasak lengkap', icon: 'ChefHat' },
            ],
          },
          styles: { padding: '20px 0' },
          seo: {},
        },
      ],
    }),
  },

  // Testimonials
  {
    id: 'testimonials-simple',
    name: 'Testimonials',
    category: 'testimonials',
    description: 'Testimoni pelanggan',
    previewColor: 'from-pink-50 to-rose-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Testimonials',
      styles: { padding: '60px 20px', backgroundColor: '#fff1f2' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Apa Kata Mereka' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'testimonial',
          content: {
            testimonials: [
              { name: 'Budi Santoso', text: 'Tempatnya bersih dan nyaman, staff ramah. Pasti kembali lagi!', rating: 5 },
              { name: 'Dewi Lestari', text: 'Lokasi strategis, dekat kampus dan pusat kota. Recommended!', rating: 5 },
            ],
          },
          styles: { padding: '20px 0' },
          seo: {},
        },
      ],
    }),
  },

  // Bookings
  {
    id: 'bookings-rooms',
    name: 'Our Rooms',
    category: 'bookings',
    description: 'Showcase kamar',
    previewColor: 'from-cyan-50 to-sky-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'Rooms',
      styles: { padding: '60px 20px', backgroundColor: '#ecfeff' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Pilihan Kamar' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'paragraph',
          content: { text: 'Berbagai tipe kamar untuk kebutuhan Anda' },
          styles: { textAlign: 'center', color: 'hsl(var(--muted-foreground))' },
          seo: {},
        },
        {
          id: generateComponentId(),
          type: 'gallery',
          content: { images: [] },
          styles: { padding: '24px 0' },
          seo: {},
        },
      ],
    }),
  },

  // FAQ
  {
    id: 'faq-section',
    name: 'FAQ',
    category: 'basic',
    description: 'Pertanyaan umum dengan schema',
    previewColor: 'from-yellow-50 to-amber-50',
    createSection: () => ({
      id: generateSectionId(),
      name: 'FAQ',
      styles: { padding: '60px 20px', backgroundColor: '#fefce8' },
      components: [
        {
          id: generateComponentId(),
          type: 'heading',
          content: { text: 'Pertanyaan Umum' },
          styles: { fontSize: '2rem', fontWeight: '600', textAlign: 'center' },
          seo: { headingLevel: 'h2' },
        },
        {
          id: generateComponentId(),
          type: 'faq',
          content: {
            faqs: [
              { question: 'Jam check-in dan check-out?', answer: 'Check-in mulai pukul 14:00 WIB dan check-out maksimal pukul 12:00 WIB.' },
              { question: 'Apakah bisa bayar di tempat?', answer: 'Ya, kami menerima pembayaran tunai, transfer bank, dan QRIS.' },
              { question: 'Apakah tersedia parkir?', answer: 'Ya, kami memiliki area parkir gratis untuk tamu.' },
            ],
          },
          styles: { padding: '24px 0', maxWidth: '700px', margin: '0 auto' },
          seo: {},
        },
      ],
    }),
  },

  // Blank section
  {
    id: 'blank-section',
    name: 'Blank Section',
    category: 'blank',
    description: 'Section kosong',
    previewColor: 'from-gray-50 to-gray-100',
    createSection: () => ({
      id: generateSectionId(),
      name: 'New Section',
      styles: { padding: '40px 20px' },
      components: [],
    }),
  },
];

export function getTemplatesByCategory(category: SectionCategory): SectionTemplate[] {
  return SECTION_TEMPLATES.filter(t => t.category === category);
}
