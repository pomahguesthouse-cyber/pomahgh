

# Plan: Wix-like Element Library Restructuring

## Current State
The ComponentLibrary has two tabs: "Basic" (14 individual elements in a grid) and "Sections" (pre-built section templates). The elements work but lack categorization and some key Wix-style elements like Slider Gallery. The existing `gallery` type only supports grid layout.

## Changes

### 1. Restructure ComponentLibrary with Wix-style Categories
Replace the flat grid with **categorized accordion sections** like Wix:

- **Text** — Heading, Paragraph
- **Image** — Single Image, Grid Gallery, Slider Gallery
- **Button** — Button, WhatsApp Button
- **Slider** — Hero Slider (with variants in the create dialog)
- **Interactive** — Video, Map Embed, HTML
- **Decorative** — Spacer, Divider, Icon, Social Links
- **Layout** — Section, Container

Each category is collapsible with an icon. Keep "Sections" tab for pre-built templates.

### 2. Add Slider Gallery Element
Currently `gallery` only renders a grid. Add a new `galleryMode` prop (`grid` | `slider`) to the existing gallery element:

- **Grid Gallery** — Current behavior (grid with configurable columns)
- **Slider Gallery** — Horizontal carousel with prev/next arrows, dot indicators, auto-play option

**GalleryElement.tsx changes:**
- Add slider mode with `useState` for current slide index
- Arrow navigation + dot indicators (reuse pattern from HeroSliderElement)
- Lightbox on click (optional)
- Props: `galleryMode`, `autoPlay`, `showArrows`, `showDots`

**ComponentLibrary:** Two separate entries — "Grid Gallery" creates gallery with `galleryMode: "grid"`, "Slider Gallery" creates with `galleryMode: "slider"`

### 3. Update PropertiesPanel for Gallery
Add content properties for gallery mode selection, image management (add/remove/reorder), and slider-specific options (autoPlay, showArrows, showDots).

### 4. Update EditorElement Type
Add `'gallery-slider'` is NOT needed — we reuse `gallery` type with `galleryMode` prop to keep it simple. No store type changes required.

### 5. Update PublicPageRenderer
Ensure gallery slider mode renders correctly in public view (already uses `isPreview={true}` which passes through to GalleryElement).

## Files to Change

| File | Change |
|------|--------|
| `ComponentLibrary.tsx` | Restructure into categorized accordion sections |
| `GalleryElement.tsx` | Add slider mode with carousel navigation |
| `PropertiesPanel.tsx` | Add gallery content properties (mode, images, slider options) |
| `PublicPageRenderer.tsx` | No change needed (already renders gallery) |

## Implementation Priority
1. Restructure ComponentLibrary categories (visual impact)
2. Build Gallery slider mode (new feature)
3. Add gallery PropertiesPanel controls (complete the feature)

