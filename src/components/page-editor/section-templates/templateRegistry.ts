import { EditorElement } from "@/stores/editorStore";
import { heroTemplates } from "./heroTemplates";
import { contentTemplates } from "./contentTemplates";
import { footerTemplates } from "./footerTemplates";

export interface SectionTemplate {
  id: string;
  name: string;
  category: 'hero' | 'content' | 'footer';
  icon: string;
  description: string;
  create: () => EditorElement;
}

export const allTemplates: SectionTemplate[] = [
  ...heroTemplates,
  ...contentTemplates,
  ...footerTemplates,
];

export const templatesByCategory = {
  hero: allTemplates.filter(t => t.category === 'hero'),
  content: allTemplates.filter(t => t.category === 'content'),
  footer: allTemplates.filter(t => t.category === 'footer'),
};
