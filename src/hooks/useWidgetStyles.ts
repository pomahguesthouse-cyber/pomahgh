import { useContext, useMemo, useState, useEffect } from 'react';
import { EditorModeContext } from '@/contexts/EditorModeContext';
import { supabase } from '@/integrations/supabase/client';
import { WidgetSettings, WidgetConfig } from '@/types/editor.types';

interface WidgetStyles {
  settings: WidgetSettings;
  headerStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
  lineStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  getButtonHoverStyle: () => React.CSSProperties;
}

export function useWidgetStyles(widgetId: string): WidgetStyles {
  const editorContext = useContext(EditorModeContext);
  const [dbWidgetConfigs, setDbWidgetConfigs] = useState<WidgetConfig[]>([]);
  
  // Only fetch from DB if not in editor mode
  useEffect(() => {
    if (!editorContext) {
      const fetchConfigs = async () => {
        const { data } = await supabase
          .from('widget_config')
          .select('*');
        
        if (data) {
          setDbWidgetConfigs(data.map(item => ({
            ...item,
            settings: (item.settings || {}) as unknown as WidgetSettings,
          })) as WidgetConfig[]);
        }
      };
      fetchConfigs();
    }
  }, [editorContext]);
  
  // Use editor context if available, otherwise use database fetch
  const widgetConfigs = editorContext?.widgetConfigs || dbWidgetConfigs;
  
  const settings = useMemo(() => {
    const widget = widgetConfigs.find(w => w.widget_id === widgetId);
    return (widget?.settings || {}) as WidgetSettings;
  }, [widgetConfigs, widgetId]);

  const headerStyle = useMemo((): React.CSSProperties => {
    const bgColor = settings.header_bg_color;
    const opacity = settings.header_bg_opacity ?? 100;
    
    if (!bgColor || bgColor === 'transparent') return {};
    
    return {
      backgroundColor: bgColor,
      opacity: opacity / 100,
    };
  }, [settings.header_bg_color, settings.header_bg_opacity]);

  const contentStyle = useMemo((): React.CSSProperties => {
    const bgColor = settings.content_bg_color;
    const opacity = settings.content_bg_opacity ?? 100;
    
    if (!bgColor || bgColor === 'transparent') return {};
    
    return {
      backgroundColor: bgColor,
      opacity: opacity / 100,
    };
  }, [settings.content_bg_color, settings.content_bg_opacity]);

  const lineStyle = useMemo((): React.CSSProperties => {
    return {
      backgroundColor: settings.line_color || undefined,
      height: settings.line_height ? `${settings.line_height}px` : undefined,
      width: settings.line_width ? `${settings.line_width}px` : undefined,
    };
  }, [settings.line_color, settings.line_height, settings.line_width]);

  const buttonStyle = useMemo((): React.CSSProperties => {
    if (!settings.button_bg_color) return {};
    
    return {
      backgroundColor: settings.button_bg_color,
      color: settings.button_text_color || undefined,
      borderRadius: settings.button_border_radius || undefined,
    };
  }, [settings.button_bg_color, settings.button_text_color, settings.button_border_radius]);

  const getButtonHoverStyle = (): React.CSSProperties => {
    if (!settings.button_hover_color) return {};
    return {
      backgroundColor: settings.button_hover_color,
    };
  };

  return {
    settings,
    headerStyle,
    contentStyle,
    lineStyle,
    buttonStyle,
    getButtonHoverStyle,
  };
}
