import { memo } from "react";
import type { EditorElement } from "@/stores/editorStore";

interface PreviewFrameProps {
  elements: EditorElement[];
  pageSettings: {
    title: string;
    slug: string;
  };
  viewMode: 'desktop' | 'tablet' | 'mobile';
  selectedElementId: string | null;
  onElementSelect?: (id: string) => void;
  className?: string;
}

const VIEWPORT_WIDTHS = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
};

const MIN_HEIGHT = 600;

export const PreviewFrame = memo(function PreviewFrame({
  elements,
  pageSettings,
  viewMode,
  className,
}: PreviewFrameProps) {
  const iframeRef = { current: null as HTMLIFrameElement | null };
  let iframeElement: HTMLIFrameElement | null = null;
  
  const safeElements = Array.isArray(elements) ? elements : [];
  const iframeWidth = VIEWPORT_WIDTHS[viewMode];

  // Generate the preview HTML
  const previewHTML = generatePreviewHTML({
    elements: safeElements,
    pageSettings,
  });

  // Create iframe using vanilla JS (no JSX)
  const container = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (container) {
    container.className = className || '';
    container.style.cssText = 'position: relative; width: 100%; height: 100%; background: #f5f5f5; overflow: auto;';
    
    // Create device frame wrapper
    const frameWrapper = document.createElement('div');
    frameWrapper.style.cssText = 'display: flex; justify-content: center; padding: 16px;';
    container.appendChild(frameWrapper);
    
    // Create device frame
    const deviceFrame = document.createElement('div');
    deviceFrame.style.cssText = 'position: relative; background: white; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden;';
    frameWrapper.appendChild(deviceFrame);
    
    // Browser top bar
    const browserBar = document.createElement('div');
    browserBar.style.cssText = 'height: 32px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; padding: 0 12px; gap: 8px;';
    browserBar.innerHTML = `
      <div style="display: flex; gap: 6px;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #f87171;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #fbbf24;"></div>
        <div style="width: 12px; height: 12px; border-radius: 50%; background: #34d399;"></div>
      </div>
      <div style="flex: 1; height: 20px; background: white; border-radius: 4px; padding: 0 8px; display: flex; align-items: center; font-size: 10px; color: #9ca3af; font-family: system-ui, sans-serif;">
        localhost:3000/${pageSettings.slug || 'preview'}
      </div>
    `;
    deviceFrame.appendChild(browserBar);
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `width: ${iframeWidth}px; min-height: ${MIN_HEIGHT}px; border: none; display: block;`;
    iframe.title = 'Page Preview';
    iframe.sandbox.add('allow-scripts', 'allow-same-origin');
    deviceFrame.appendChild(iframe);
    
    iframeElement = iframe;
    
    // Write content to iframe
    if (iframe.contentDocument) {
      iframe.contentDocument.open();
      iframe.contentDocument.write(previewHTML);
      iframe.contentDocument.close();
    }
    
    // Use srcdoc for modern browsers
    iframe.srcdoc = previewHTML;
    
    // Update periodically
    setInterval(() => {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        // Content is loaded
      }
    }, 100);
  }

  return {
    type: 'div',
    props: {
      className,
      style: { position: 'relative', width: '100%', height: '100%', background: '#f5f5f5', overflow: 'auto' },
      children: {
        type: 'div',
        props: {
          style: { display: 'flex', justifyContent: 'center', padding: '16px' },
          children: {
            type: 'div',
            props: {
              style: { position: 'relative', background: 'white', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { height: '32px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px' },
                    dangerouslySetInnerHTML: {
                      __html: `
                        <div style="display: flex; gap: 6px;">
                          <div style="width: 12px; height: 12px; border-radius: 50%; background: #f87171;"></div>
                          <div style="width: 12px; height: 12px; border-radius: 50%; background: #fbbf24;"></div>
                          <div style="width: 12px; height: 12px; border-radius: 50%; background: #34d399;"></div>
                        </div>
                        <div style="flex: 1; height: 20px; background: white; border-radius: 4px; padding: 0 8px; display: flex; align-items: center; font-size: 10px; color: #9ca3af; font-family: system-ui, sans-serif;">
                          localhost:3000/${pageSettings.slug || 'preview'}
                        </div>
                      `
                    }
                  }
                },
                {
                  type: 'iframe',
                  props: {
                    title: 'Page Preview',
                    srcdoc: previewHTML,
                    style: { width: `${iframeWidth}px`, minHeight: `${MIN_HEIGHT}px`, border: 'none', display: 'block' },
                    sandbox: 'allow-scripts allow-same-origin'
                  }
                }
              ]
            }
          }
        }
      }
    }
  };
});

interface PreviewHTMLOptions {
  elements: EditorElement[];
  pageSettings: {
    title: string;
    slug: string;
  };
}

function generatePreviewHTML(options: PreviewHTMLOptions): string {
  const { elements, pageSettings } = options;
  
  const headStyles = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageSettings.title || 'Preview')}</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
        },
      },
    }
  </script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    img { max-width: 100%; height: auto; }
    section { margin-bottom: 0; }
  </style>
</head>
<body>
  <div id="root">
    ${renderElementsToHTML(elements)}
  </div>
</body>
</html>`;
  
  return headStyles;
}

function renderElementsToHTML(elements: EditorElement[]): string {
  if (!elements || elements.length === 0) {
    return `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; color: #9ca3af;">
      <p style="font-size: 18px;">No content to preview</p>
    </div>`;
  }
  
  return elements.map(element => renderElementToHTML(element)).join('');
}

function renderElementToHTML(element: EditorElement): string {
  const { type, props, styles, position } = element;
  
  const styleString = buildStyleString(styles, position);
  
  switch (type) {
    case 'heading': return renderHeading(props, styleString);
    case 'paragraph': return renderParagraph(props, styleString);
    case 'image': return renderImage(props, styleString);
    case 'button': return renderButton(props, styleString);
    case 'spacer': return renderSpacer(styles);
    case 'divider': return renderDivider(styles);
    case 'section': return renderSection(element.children || [], props, styles);
    case 'container': return renderContainer(element.children || [], props, styles);
    case 'gallery': return renderGallery(props, styles);
    case 'hero-slider': return renderHeroSlider(props, styles);
    case 'room-slider': return renderRoomSlider(props, styles);
    case 'facilities': return renderFacilities(props, styles);
    case 'news-events': return renderNewsEvents(props, styles);
    case 'nearby-locations': return renderNearbyLocations(props, styles);
    case 'map-embed': return renderMapEmbed(props, styles);
    case 'video': return renderVideo(props, styles);
    case 'whatsapp-button': return renderWhatsAppButton(props, styles);
    case 'social-links': return renderSocialLinks(props, styles);
    case 'icon': return renderIcon(props, styles);
    default: return `<div style="padding: 16px; background: #f3f4f6; color: #6b7280;">Unknown element: ${type}</div>`;
  }
}

function buildStyleString(styles?: Record<string, unknown>, position?: Partial<{x: number; y: number; width: number; height: number; rotation: number; zIndex: number}>): string {
  const parts: string[] = [];
  
  if (styles) {
    if (styles.backgroundColor) parts.push(`background-color: ${styles.backgroundColor}`);
    if (styles.textAlign) parts.push(`text-align: ${styles.textAlign}`);
    if (styles.fontSize) parts.push(`font-size: ${styles.fontSize}`);
    if (styles.fontWeight) parts.push(`font-weight: ${styles.fontWeight}`);
    if (styles.color) parts.push(`color: ${styles.color}`);
    if (styles.borderRadius) parts.push(`border-radius: ${styles.borderRadius}`);
    if (styles.width) parts.push(`width: ${styles.width}`);
    if (styles.marginTop) parts.push(`margin-top: ${styles.marginTop}`);
    if (styles.marginBottom) parts.push(`margin-bottom: ${styles.marginBottom}`);
    if (styles.paddingTop) parts.push(`padding-top: ${styles.paddingTop}`);
    if (styles.paddingBottom) parts.push(`padding-bottom: ${styles.paddingBottom}`);
    if (styles.minHeight) parts.push(`min-height: ${styles.minHeight}`);
  }
  
  if (position) {
    if (position.x !== undefined) parts.push(`left: ${position.x}px`);
    if (position.y !== undefined) parts.push(`top: ${position.y}px`);
    if (position.width !== undefined) parts.push(`width: ${position.width}px`);
    if (position.height !== undefined) parts.push(`height: ${position.height}px`);
    if (position.rotation && position.rotation !== 0) parts.push(`transform: rotate(${position.rotation}deg)`);
    if (position.zIndex && position.zIndex !== 0) parts.push(`z-index: ${position.zIndex}`);
  }
  
  return parts.join('; ');
}

function renderHeading(props: Record<string, unknown>, baseStyle: string): string {
  const level = (props.level as string) || 'h2';
  const content = (props.content as string) || 'Heading Text';
  
  const fontSizeClass = level === 'h1' ? 'text-4xl md:text-5xl' : 
                        level === 'h2' ? 'text-3xl md:text-4xl' : 
                        level === 'h3' ? 'text-2xl md:text-3xl' : 
                        'text-xl md:text-2xl';
  
  return `<${level} class="font-bold ${fontSizeClass}" style="${baseStyle}">${escapeHtml(content)}</${level}>`;
}

function renderParagraph(props: Record<string, unknown>, baseStyle: string): string {
  const content = (props.content as string) || 'Paragraph text';
  return `<p class="text-gray-700 leading-relaxed" style="${baseStyle}">${escapeHtml(content)}</p>`;
}

function renderImage(props: Record<string, unknown>, baseStyle: string): string {
  const src = (props.src as string) || 'https://via.placeholder.com/800x400';
  const alt = (props.alt as string) || 'Image';
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="w-full h-auto object-cover" style="${baseStyle}" loading="lazy" />`;
}

function renderButton(props: Record<string, unknown>, baseStyle: string): string {
  const label = (props.label as string) || 'Click Me';
  const url = (props.url as string) || '#';
  const variant = (props.variant as string) || 'default';
  
  const variantClass = variant === 'default' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                       variant === 'secondary' ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' :
                       'border-2 border-blue-600 text-blue-600 hover:bg-blue-50';
  
  return `<a href="${escapeHtml(url)}" class="inline-block px-6 py-3 rounded-lg font-medium transition-colors ${variantClass}" style="${baseStyle}">${escapeHtml(label)}</a>`;
}

function renderSpacer(styles?: Record<string, unknown>): string {
  const height = (styles?.minHeight as string) || '40px';
  return `<div style="min-height: ${height}"></div>`;
}

function renderDivider(styles?: Record<string, unknown>): string {
  const margin = (styles?.marginTop as string) || (styles?.marginBottom as string) || '16px';
  return `<hr style="border-color: #d1d5db; margin: ${margin} 0;" />`;
}

function renderSection(children: EditorElement[], props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const title = props.title as string;
  const subtitle = props.subtitle as string;
  const styleString = buildStyleString(styles);
  
  return `<section class="w-full" style="${styleString}">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0 16px;">
      ${title ? `<h2 style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 16px;">${escapeHtml(title)}</h2>` : ''}
      ${subtitle ? `<p style="color: #6b7280; text-align: center; margin-bottom: 32px;">${escapeHtml(subtitle)}</p>` : ''}
      ${children.map(child => renderElementToHTML(child)).join('')}
    </div>
  </section>`;
}

function renderContainer(children: EditorElement[], props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const direction = (props.direction as string) || 'column';
  const styleString = buildStyleString(styles);
  const flexDirection = direction === 'row' ? 'row' : 'column';
  
  return `<div style="display: flex; flex-direction: ${flexDirection}; ${styleString}">
    ${children.map(child => renderElementToHTML(child)).join('')}
  </div>`;
}

function renderGallery(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const images = (props.images as Array<{src: string; alt?: string}>) || [];
  const mode = (props.galleryMode as string) || 'grid';
  const styleString = buildStyleString(styles);
  
  if (images.length === 0) {
    return `<div style="padding: 32px; background: #f3f4f6; text-align: center; color: #6b7280; ${styleString}">Gallery (${images.length} images)</div>`;
  }
  
  if (mode === 'slider') {
    return `<div style="position: relative; overflow: hidden; ${styleString}">
      <div style="display: flex; gap: 8px;">
        ${images.map(img => `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}" style="width: 100%; height: 256px; object-fit: cover; border-radius: 8px;" />`).join('')}
      </div>
    </div>`;
  }
  
  return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; ${styleString}">
    ${images.map(img => `<img src="${escapeHtml(img.src)}" alt="${escapeHtml(img.alt || '')}" style="width: 100%; height: 192px; object-fit: cover; border-radius: 8px;" />`).join('')}
  </div>`;
}

function renderHeroSlider(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const slides = (props.slides as Array<{imageUrl?: string; headline?: string; subheadline?: string; ctaText?: string; ctaUrl?: string}>) || [];
  const height = (props.height as string) || '500px';
  const overlayColor = (props.overlayColor as string) || 'rgba(0,0,0,0.5)';
  const headingColor = (props.headingColor as string) || '#ffffff';
  const subheadingColor = (props.subheadingColor as string) || '#e0e0e0';
  const ctaBgColor = (props.ctaBgColor as string) || '#e11d48';
  const styleString = buildStyleString(styles);
  
  if (slides.length === 0) {
    return `<div style="position: relative; background: #1f2937; display: flex; align-items: center; justify-content: center; color: white; height: ${height}; ${styleString}">
      <div style="text-align: center;">
        <p style="font-size: 24px; font-weight: bold;">Hero Slider</p>
        <p style="font-size: 14px; opacity: 0.75;">Add slides to see preview</p>
      </div>
    </div>`;
  }
  
  const slide = slides[0];
  const imageUrl = slide.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920';
  
  return `<div style="position: relative; overflow: hidden; height: ${height}; ${styleString}">
    <img src="${escapeHtml(imageUrl)}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;" />
    <div style="position: absolute; inset: 0; background-color: ${overlayColor}"></div>
    <div style="position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 16px;">
      <h1 style="font-size: 36px; font-weight: bold; margin-bottom: 16px; color: ${headingColor}">${escapeHtml(slide.headline || 'Welcome')}</h1>
      <p style="font-size: 20px; margin-bottom: 32px; color: ${subheadingColor}">${escapeHtml(slide.subheadline || '')}</p>
      ${slide.ctaText ? `<a href="${escapeHtml(slide.ctaUrl || '#')}" style="padding: 12px 32px; border-radius: 8px; font-weight: 600; color: white; background-color: ${ctaBgColor};">${escapeHtml(slide.ctaText)}</a>` : ''}
    </div>
  </div>`;
}

function renderRoomSlider(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const title = (props.title as string) || 'Our Rooms';
  const styleString = buildStyleString(styles);
  
  return `<section style="padding: 48px 0; background: #f9fafb; ${styleString}">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0 16px;">
      <h2 style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 32px;">${escapeHtml(title)}</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
        ${[1, 2, 3].map(i => `<div style="background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600" alt="Room ${i}" style="width: 100%; height: 192px; object-fit: cover;" />
          <div style="padding: 16px;">
            <h3 style="font-weight: 600; font-size: 18px;">Room Type ${i}</h3>
            <p style="color: #6b7280; font-size: 14px; margin: 8px 0;">Comfortable room with modern amenities</p>
            <p style="font-weight: bold; color: #2563eb;">Rp 500.000 <span style="font-weight: normal; font-size: 14px; color: #9ca3af;">/ night</span></p>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderFacilities(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const title = (props.title as string) || 'Hotel Facilities';
  const columns = (props.columns as number) || 3;
  const styleString = buildStyleString(styles);
  
  const facilities = [
    { name: 'Swimming Pool', icon: '🏊' },
    { name: 'Free WiFi', icon: '📶' },
    { name: 'Restaurant', icon: '🍽️' },
    { name: 'Spa & Wellness', icon: '💆' },
    { name: 'Gym', icon: '🏋️' },
    { name: '24/7 Reception', icon: '🛎️' },
  ];
  
  return `<section style="padding: 48px 0; background: white; ${styleString}">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0 16px;">
      <h2 style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 32px;">${escapeHtml(title)}</h2>
      <div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 24px;">
        ${facilities.map(f => `<div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <span style="font-size: 32px;">${f.icon}</span>
          <span style="font-weight: 500;">${f.name}</span>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderNewsEvents(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const title = (props.title as string) || 'News & Events';
  const layout = (props.layout as string) || 'slider';
  const styleString = buildStyleString(styles);
  
  const events = [
    { title: 'Semarang Culinary Festival', date: '15 Mar 2026', category: 'Kuliner' },
    { title: 'City Marathon 2026', date: '20 Mar 2026', category: 'Olahraga' },
    { title: 'Art Exhibition', date: '25 Mar 2026', category: 'Budaya' },
  ];
  
  const gridClass = layout === 'grid' ? 'grid grid-cols-3 gap-6' : 'flex gap-6 overflow-x-auto';
  
  return `<section style="padding: 48px 0; background: #f9fafb; ${styleString}">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0 16px;">
      <h2 style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 32px;">${escapeHtml(title)}</h2>
      <div style="${gridClass === 'flex gap-6 overflow-x-auto' ? 'display: flex; gap: 24px; overflow-x: auto;' : 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;'}">
        ${events.map(e => `<div style="background: white; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); overflow: hidden; ${layout === 'slider' ? 'flex-shrink: 0; width: 320px;' : ''}">
          <div style="height: 128px; background: linear-gradient(135deg, #3b82f6, #8b5cf6);"></div>
          <div style="padding: 16px;">
            <span style="font-size: 12px; font-weight: 500; color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px;">${e.category}</span>
            <h3 style="font-weight: 600; margin-top: 8px;">${escapeHtml(e.title)}</h3>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">${e.date}</p>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderNearbyLocations(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const title = (props.title as string) || 'Nearby Locations';
  const columns = (props.columns as number) || 2;
  const styleString = buildStyleString(styles);
  
  const locations = [
    { name: 'Simpang Lima', distance: '1.2 km' },
    { name: 'Lawang Sewu', distance: '2.5 km' },
    { name: 'Kota Lama', distance: '3.0 km' },
    { name: 'Sam Poo Kong', distance: '4.5 km' },
  ];
  
  return `<section style="padding: 48px 0; background: white; ${styleString}">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0 16px;">
      <h2 style="font-size: 30px; font-weight: bold; text-align: center; margin-bottom: 32px;">${escapeHtml(title)}</h2>
      <div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 16px;">
        ${locations.map(l => `<div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <span style="font-weight: 500;">${escapeHtml(l.name)}</span>
          <span style="color: #6b7280; font-size: 14px;">${l.distance}</span>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderMapEmbed(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const height = (props.mapHeight as string) || '400px';
  const styleString = buildStyleString(styles);
  
  return `<div style="background: #e5e7eb; display: flex; align-items: center; justify-content: center; height: ${height}; ${styleString}">
    <div style="text-align: center; color: #6b7280;">
      <svg style="width: 48px; height: 48px; margin: 0 auto 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <p>Map Preview</p>
    </div>
  </div>`;
}

function renderVideo(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const videoUrl = props.videoUrl as string;
  const styleString = buildStyleString(styles);
  
  if (!videoUrl) {
    return `<div style="background: #111827; display: flex; align-items: center; justify-content: center; aspect-ratio: 16/9; ${styleString}">
      <div style="text-align: center; color: white;">
        <svg style="width: 64px; height: 64px; margin: 0 auto 8px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p>Add video URL to preview</p>
      </div>
    </div>`;
  }
  
  const embedUrl = getEmbedUrl(videoUrl);
  
  return `<div style="position: relative; background: #111827; aspect-ratio: 16/9; ${styleString}">
    <iframe src="${embedUrl}" style="position: absolute; inset: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
  </div>`;
}

function renderWhatsAppButton(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const phoneNumber = (props.phoneNumber as string) || '';
  const message = (props.message as string) || '';
  const label = (props.label as string) || 'Chat WhatsApp';
  const styleString = buildStyleString(styles);
  
  const waUrl = phoneNumber ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}` : '#';
  
  return `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: #22c55e; color: white; border-radius: 9999px; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); ${styleString}">
    <svg style="width: 20px; height: 20px;" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
    ${escapeHtml(label)}
  </a>`;
}

function renderSocialLinks(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const links = (props.links as Array<{platform: string; url?: string}>) || [
    { platform: 'instagram', url: '#' },
    { platform: 'facebook', url: '#' },
    { platform: 'twitter', url: '#' },
  ];
  const iconSize = (props.iconSize as number) || 24;
  const iconColor = (props.iconColor as string) || '#64748b';
  const styleString = buildStyleString(styles);
  
  const icons: Record<string, string> = {
    instagram: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>',
    facebook: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
    twitter: '<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>',
  };
  
  return `<div style="display: flex; align-items: center; gap: 16px; ${styleString}">
    ${links.map(link => `<a href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener noreferrer" style="transition: opacity 0.2s;">
      <svg style="width: ${iconSize}px; height: ${iconSize}px; fill: ${iconColor};" viewBox="0 0 24 24">${icons[link.platform] || ''}</svg>
    </a>`).join('')}
  </div>`;
}

function renderIcon(props: Record<string, unknown>, styles?: Record<string, unknown>): string {
  const iconSize = (props.iconSize as number) || 48;
  const iconColor = (props.iconColor as string) || '#0f172a';
  const styleString = buildStyleString(styles);
  
  return `<div style="display: flex; align-items: center; justify-content: center; ${styleString}">
    <svg style="width: ${iconSize}px; height: ${iconSize}px; color: ${iconColor};" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  </div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEmbedUrl(url: string): string {
  if (url.includes('youtube.com/watch')) {
    const videoId = new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('vimeo.com/')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return `https://player.vimeo.com/video/${videoId}`;
  }
  return url;
}

export default PreviewFrame;
