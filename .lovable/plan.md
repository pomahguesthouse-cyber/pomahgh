

# Plan: Wix-style Landing Page Editor Enhancement

## Current State
The editor has a solid foundation: ComponentLibrary (10 element types), EditorCanvas with @dnd-kit, PropertiesPanel with content/style/layout tabs, undo/redo, responsive preview, and inline editing already works for HeadingElement (contentEditable + double-click).

## Phase 1: Section Templates (Highest Impact)

### Approach
Add a "Templates" tab in ComponentLibrary alongside existing "Components" tab. Each template is a pre-built `EditorElement` tree (section + children) that gets inserted as a group.

### New Files
- `src/components/page-editor/section-templates/` — folder for template definitions
  - `heroTemplates.ts` — Hero sections (image+CTA, centered dual buttons, video bg)
  - `contentTemplates.ts` — Features grid, About, Testimonials, FAQ, CTA banner, Pricing
  - `footerTemplates.ts` — Simple footer, full footer
  - `templateRegistry.ts` — exports all templates with metadata (name, thumbnail, category)

### Template Data Structure
Each template is a factory function returning `EditorElement` with unique IDs:
```typescript
interface SectionTemplate {
  id: string;
  name: string;
  category: 'hero' | 'content' | 'footer';
  thumbnail: string; // inline SVG or emoji placeholder
  create: () => EditorElement; // returns section with children
}
```

### ComponentLibrary Changes
- Add tabs: "Elements" (current grid) and "Templates" (new, with category filters)
- Template items show preview thumbnail, clicking inserts the full section
- Templates are draggable just like individual components

### Templates to Build (10 total)
1. **Hero Image + CTA** — full-width bg image, heading, subheading, button
2. **Hero Centered** — centered text, dual buttons (primary + outline)
3. **Features 3-Column** — section with 3 containers, each with icon placeholder + heading + paragraph
4. **About Image+Text** — 2-column container (image left, text right)
5. **Testimonials Grid** — 3-column grid of quote cards
6. **FAQ Section** — heading + list of Q&A paragraphs
7. **CTA Banner** — colored background section with heading + button
8. **Pricing 3-Column** — 3 price cards with features list
9. **Simple Footer** — dark section with paragraph (copyright)
10. **Full Footer** — 4-column links + social row

## Phase 2: Layer Panel

### Store Changes (`editorStore.ts`)
- Add to `EditorElement`: `isVisible?: boolean`, `isLocked?: boolean`, `label?: string`
- Add actions: `toggleElementVisibility(id)`, `toggleElementLock(id)`, `renameElement(id, label)`

### New File: `src/components/page-editor/LayerPanel.tsx`
- Tree view with indentation for children (section > container > elements)
- Each row: drag handle, visibility eye toggle, lock icon, element type icon, label/name
- Click to select, double-click to rename
- Collapsible for sections/containers
- Search/filter input at top

### Layout Integration
- Add toggle button in EditorToolbar to show/hide LayerPanel
- LayerPanel renders between ComponentLibrary and EditorCanvas
- Add `showLayerPanel: boolean` to store UI state

### ElementRenderer/ElementWrapper Changes
- Skip rendering if `element.isVisible === false` (show dimmed in editor, hidden in preview)
- Disable interactions if `element.isLocked === true`

## Phase 3: Inline Editing Enhancement

HeadingElement already has inline editing. Extend same pattern to:
- **ParagraphElement** — contentEditable on double-click
- **ButtonElement** — contentEditable on label text on double-click

Each follows the same pattern already in HeadingElement: `useState(isEditing)`, `contentEditable`, blur to save, Escape to cancel.

## Phase 4: New Element Types

Add to `EditorElement.type` union and create corresponding files:

- **VideoElement** — YouTube/Vimeo embed via iframe (prop: `videoUrl`)
- **IconElement** — Lucide icon picker (prop: `iconName`, `iconSize`, `iconColor`)
- **SocialLinksElement** — Row of social media icon links
- **WhatsAppButtonElement** — Floating/inline WA CTA button (prop: `phoneNumber`, `message`)
- **MapEmbedElement** — Google Maps iframe (prop: `embedUrl`)

Each needs: element file, entry in ElementRenderer switch, entry in ComponentLibrary, ContentProperties in PropertiesPanel.

## Phase 5: Color Picker Enhancement

Replace basic `<input type="color">` in PropertiesPanel with a custom `ColorPickerField` component:
- Color swatches (brand presets from hotel_settings primary color + neutrals)
- Recent colors (stored in localStorage, max 8)
- Hex input field
- Opacity slider
- Native color picker as fallback

## Implementation Order & Effort

| Phase | Files Created/Modified | Estimated Complexity |
|-------|----------------------|---------------------|
| 1. Section Templates | ~6 new files, modify ComponentLibrary | Medium |
| 2. Layer Panel | 1 new file, modify store + renderer + toolbar | Medium-High |
| 3. Inline Editing | Modify ParagraphElement, ButtonElement | Low |
| 4. New Element Types | ~5 new files, modify renderer + library + panel | Medium |
| 5. Color Picker | 1 new component, modify PropertiesPanel | Low |

Due to the scope, I recommend implementing **Phase 1 (Section Templates) + Phase 3 (Inline Editing)** first as they deliver the most user value with manageable complexity. Then Phase 2 (Layer Panel), then Phases 4-5.

