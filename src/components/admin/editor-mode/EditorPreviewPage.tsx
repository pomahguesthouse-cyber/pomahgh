import React from 'react';
import { useEditorMode } from '@/contexts/EditorModeContext';
import { EditableWidget } from './EditableWidget';

// Import all widgets with named exports
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import { Welcome } from '@/components/Welcome';
import { Rooms } from '@/components/Rooms';
import { Amenities } from '@/components/Amenities';
import { GoogleRating } from '@/components/GoogleRating';
import { Location } from '@/components/Location';
import { NewsEvents } from '@/components/NewsEvents';
import { Footer } from '@/components/Footer';

// Widget mapping - all components available in the page editor
const WIDGET_COMPONENTS: Record<string, { component: React.ComponentType<any>; label: string }> = {
  header: { component: Header, label: 'Header' },
  hero: { component: Hero, label: 'Hero Slider' },
  welcome: { component: Welcome, label: 'Welcome Section' },
  rooms: { component: Rooms, label: 'Rooms' },
  amenities: { component: Amenities, label: 'Amenities' },
  google_rating: { component: GoogleRating, label: 'Google Rating' },
  location: { component: Location, label: 'Location' },
  news_events: { component: NewsEvents, label: 'News & Events' },
  footer: { component: Footer, label: 'Footer' },
};

export function EditorPreviewPage() {
  const { widgetConfigs } = useEditorMode();

  // Sort widgets by sort_order
  const sortedWidgets = [...widgetConfigs].sort((a, b) => a.sort_order - b.sort_order);

  // Separate fixed widgets (header, footer) from content widgets
  const headerConfig = widgetConfigs.find(w => w.widget_id === 'header');
  const footerConfig = widgetConfigs.find(w => w.widget_id === 'footer');
  const contentWidgets = sortedWidgets.filter(
    w => w.widget_id !== 'header' && w.widget_id !== 'footer'
  );

  const renderWidget = (widgetId: string, isEnabled: boolean) => {
    const widgetDef = WIDGET_COMPONENTS[widgetId];
    if (!widgetDef) return null;

    const WidgetComponent = widgetDef.component;

    return (
      <EditableWidget 
        key={widgetId} 
        id={widgetId} 
        label={widgetDef.label}
      >
        <WidgetComponent editorMode={true} />
      </EditableWidget>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - always at top */}
      {headerConfig && renderWidget('header', headerConfig.enabled)}

      {/* Main content */}
      <main className="flex-1">
        {contentWidgets.map(widget => 
          renderWidget(widget.widget_id, widget.enabled)
        )}
      </main>

      {/* Footer - always at bottom */}
      {footerConfig && renderWidget('footer', footerConfig.enabled)}
    </div>
  );
}
