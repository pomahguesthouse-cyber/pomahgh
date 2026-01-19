import { EditableText } from '@/components/admin/editor-mode/EditableText';
import { usePublicOverrides } from '@/contexts/PublicOverridesContext';

interface WelcomeProps {
  editorMode?: boolean;
}

export const Welcome = ({ editorMode = false }: WelcomeProps) => {
  const { getElementStyles } = usePublicOverrides();
  
  const title = "Your Perfect Stay";
  const paragraph1 = "Kata Pomah dalam bahasa Jawa yang berarti Rumah. Terletak sedikit di pinggir kota Semarang yang dijuluki Venice of Java, Pomah Guesthouse memiliki filosofi yang mencerminkan kehangatan, kenyamanan dan standar pelayanan terbaik yang kami sajikan kepada tamu.";
  const paragraph2 = "Kami di Pomah Yakin bahwa setiap perjalanan seharusnya memberikan cerita- cerita baru dimulai, kenangan indah tercipta dan momen kebersamaan terjalin";

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="animate-slide-up">
          {editorMode ? (
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
          <div className="w-16 sm:w-24 h-1 bg-primary mx-auto mb-6 sm:mb-8"></div>
          {editorMode ? (
            <>
              <EditableText
                widgetId="welcome"
                field="paragraph1"
                value={paragraph1}
                as="p"
                multiline
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-4"
              />
              <EditableText
                widgetId="welcome"
                field="paragraph2"
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
                style={getElementStyles('welcome-paragraph1')}
              >
                {paragraph1}
              </p>
              <p 
                className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed px-4"
                style={getElementStyles('welcome-paragraph2')}
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