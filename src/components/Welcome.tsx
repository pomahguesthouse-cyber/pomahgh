import { EditableText } from '@/components/admin/editor-mode/EditableText';
import { usePublicOverrides } from '@/contexts/PublicOverridesContext';
import { useWidgetStyles } from '@/hooks/useWidgetStyles';
import { useContext } from 'react';
import { EditorModeContext } from '@/contexts/EditorModeContext';

interface WelcomeProps {
  editorMode?: boolean;
}

export const Welcome = ({ editorMode = false }: WelcomeProps) => {
  const { getElementStyles } = usePublicOverrides();
  const editorContext = useContext(EditorModeContext);
  const isEditorMode = editorContext?.isEditorMode ?? editorMode;
  const { settings, lineStyle } = useWidgetStyles('welcome');
  
  const title = settings.title_override || "Your Perfect Stay";
  const paragraph1 = "Kata Pomah dalam bahasa Jawa yang berarti Rumah. Terletak sedikit di pinggir kota Semarang yang dijuluki Venice of Java, Pomah Guesthouse memiliki filosofi yang mencerminkan kehangatan, kenyamanan dan standar pelayanan terbaik yang kami sajikan kepada tamu.";
  const paragraph2 = "Kami di Pomah Yakin bahwa setiap perjalanan seharusnya memberikan cerita- cerita baru dimulai, kenangan indah tercipta dan momen kebersamaan terjalin";

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="animate-slide-up">
          {isEditorMode ? (
            <EditableText
              widgetId="welcome"
              field="title"
              value={title}
              as="h2"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-semibold text-foreground mb-4 sm:mb-6 px-2"
            />
          ) : (
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-cinzel font-semibold text-foreground mb-4 sm:mb-6 px-2"
              style={getElementStyles('welcome-title')}
            >
              {title}
            </h2>
          )}
          
          {/* Line with widget styling */}
          <div 
            className="h-1 bg-primary mx-auto mb-6 sm:mb-8"
            style={{
              width: lineStyle.width || '96px',
              height: lineStyle.height || '4px',
              backgroundColor: lineStyle.backgroundColor || undefined,
            }}
          />
          
          {isEditorMode ? (
            <>
              <EditableText
                widgetId="welcome"
                field="description"
                value={paragraph1}
                as="p"
                multiline
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-4"
              />
              <EditableText
                widgetId="welcome"
                field="description2"
                value={paragraph2}
                as="p"
                multiline
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-4"
              />
            </>
          ) : (
            <>
              <p 
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-4"
                style={getElementStyles('welcome-description')}
              >
                {paragraph1}
              </p>
              <p 
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-4"
                style={getElementStyles('welcome-description2')}
              >
                {paragraph2}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
