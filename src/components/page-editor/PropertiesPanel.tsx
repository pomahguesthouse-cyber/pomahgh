import React from 'react';
import { usePageEditor } from '@/contexts/PageEditorContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Settings2, Palette, Search } from 'lucide-react';
import { PageComponent, PageSection } from '@/types/page-editor';

function ComponentProperties({ component }: { component: PageComponent }) {
  const { updateComponent, deleteComponent } = usePageEditor();

  const handleContentChange = (key: string, value: string | string[] | object) => {
    updateComponent(component.id, {
      content: { ...component.content, [key]: value }
    });
  };

  const handleStyleChange = (key: string, value: string) => {
    updateComponent(component.id, {
      styles: { ...component.styles, [key]: value }
    });
  };

  const handleSEOChange = (key: string, value: string) => {
    updateComponent(component.id, {
      seo: { ...component.seo, [key]: value }
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm capitalize">{component.type.replace('-', ' ')}</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteComponent(component.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content" className="text-xs">
            <Settings2 className="h-3 w-3 mr-1" />
            Konten
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="seo" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            SEO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          {/* Text content */}
          {(component.type === 'heading' || component.type === 'paragraph') && (
            <div className="space-y-2">
              <Label>Teks</Label>
              <Textarea
                value={component.content.text || ''}
                onChange={(e) => handleContentChange('text', e.target.value)}
                rows={component.type === 'paragraph' ? 4 : 2}
              />
            </div>
          )}

          {/* Image */}
          {component.type === 'image' && (
            <>
              <div className="space-y-2">
                <Label>URL Gambar</Label>
                <Input
                  value={component.content.src || ''}
                  onChange={(e) => handleContentChange('src', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Alt Text</Label>
                <Input
                  value={component.seo.altText || ''}
                  onChange={(e) => handleSEOChange('altText', e.target.value)}
                  placeholder="Deskripsi gambar"
                />
              </div>
            </>
          )}

          {/* CTA Button */}
          {component.type === 'cta-button' && (
            <>
              <div className="space-y-2">
                <Label>Teks Tombol</Label>
                <Input
                  value={component.content.buttonText || ''}
                  onChange={(e) => handleContentChange('buttonText', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nomor WhatsApp</Label>
                <Input
                  value={component.content.whatsappNumber || ''}
                  onChange={(e) => handleContentChange('whatsappNumber', e.target.value)}
                  placeholder="6281234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>Pesan WhatsApp</Label>
                <Textarea
                  value={component.content.whatsappMessage || ''}
                  onChange={(e) => handleContentChange('whatsappMessage', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Style Tombol</Label>
                <Select 
                  value={component.content.buttonStyle || 'primary'}
                  onValueChange={(v) => handleContentChange('buttonStyle', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp (Hijau)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Hero Section */}
          {component.type === 'hero-section' && (
            <>
              <div className="space-y-2">
                <Label>Headline (H1)</Label>
                <Input
                  value={component.content.text || ''}
                  onChange={(e) => handleContentChange('text', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subheadline</Label>
                <Textarea
                  value={component.content.html || ''}
                  onChange={(e) => handleContentChange('html', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Teks CTA</Label>
                <Input
                  value={component.content.buttonText || ''}
                  onChange={(e) => handleContentChange('buttonText', e.target.value)}
                />
              </div>
            </>
          )}

          {/* SEO Content */}
          {component.type === 'seo-content' && (
            <div className="space-y-2">
              <Label>Konten (HTML)</Label>
              <Textarea
                value={component.content.html || ''}
                onChange={(e) => handleContentChange('html', e.target.value)}
                rows={8}
                placeholder="<p>Konten SEO...</p>"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Padding</Label>
            <Input
              value={component.styles.padding || ''}
              onChange={(e) => handleStyleChange('padding', e.target.value)}
              placeholder="20px"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Margin</Label>
            <Input
              value={component.styles.margin || ''}
              onChange={(e) => handleStyleChange('margin', e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={component.styles.backgroundColor?.startsWith('#') ? component.styles.backgroundColor : '#ffffff'}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                value={component.styles.backgroundColor || ''}
                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                placeholder="transparent"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Text Align</Label>
            <Select 
              value={component.styles.textAlign || 'left'}
              onValueChange={(v) => handleStyleChange('textAlign', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Kiri</SelectItem>
                <SelectItem value="center">Tengah</SelectItem>
                <SelectItem value="right">Kanan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Font Size</Label>
            <Input
              value={component.styles.fontSize || ''}
              onChange={(e) => handleStyleChange('fontSize', e.target.value)}
              placeholder="1rem"
            />
          </div>

          <div className="space-y-2">
            <Label>Border Radius</Label>
            <Input
              value={component.styles.borderRadius || ''}
              onChange={(e) => handleStyleChange('borderRadius', e.target.value)}
              placeholder="0"
            />
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-4">
          {(component.type === 'heading' || component.type === 'hero-section') && (
            <div className="space-y-2">
              <Label>Heading Level</Label>
              <Select 
                value={component.seo.headingLevel || 'h2'}
                onValueChange={(v) => handleSEOChange('headingLevel', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1 (Hanya 1 per halaman)</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {component.type === 'image' && (
            <div className="space-y-2">
              <Label>Alt Text (SEO)</Label>
              <Textarea
                value={component.seo.altText || ''}
                onChange={(e) => handleSEOChange('altText', e.target.value)}
                placeholder="Deskripsi gambar untuk SEO"
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Keyword Hint</Label>
            <Input
              value={component.seo.keywordHint || ''}
              onChange={(e) => handleSEOChange('keywordHint', e.target.value)}
              placeholder="keyword target"
            />
            <p className="text-xs text-muted-foreground">
              Keyword yang harus ada di komponen ini
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionProperties({ section }: { section: PageSection }) {
  const { updateSection, deleteSection } = usePageEditor();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Section</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => deleteSection(section.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Nama Section</Label>
        <Input
          value={section.name}
          onChange={(e) => updateSection(section.id, { name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Padding</Label>
        <Input
          value={section.styles.padding || ''}
          onChange={(e) => updateSection(section.id, { 
            styles: { ...section.styles, padding: e.target.value } 
          })}
          placeholder="40px 20px"
        />
      </div>

      <div className="space-y-2">
        <Label>Background Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={section.styles.backgroundColor?.startsWith('#') ? section.styles.backgroundColor : '#ffffff'}
            onChange={(e) => updateSection(section.id, { 
              styles: { ...section.styles, backgroundColor: e.target.value } 
            })}
            className="w-12 h-10 p-1"
          />
          <Input
            value={section.styles.backgroundColor || ''}
            onChange={(e) => updateSection(section.id, { 
              styles: { ...section.styles, backgroundColor: e.target.value } 
            })}
            placeholder="transparent"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { schema, editorState } = usePageEditor();

  // Find selected component or section
  const selectedComponent = editorState.selectedComponentId 
    ? schema.sections.flatMap(s => s.components).find(c => c.id === editorState.selectedComponentId)
    : null;

  const selectedSection = editorState.selectedSectionId
    ? schema.sections.find(s => s.id === editorState.selectedSectionId)
    : null;

  return (
    <div className="w-72 border-l bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Properties</h2>
      </div>
      
      <ScrollArea className="flex-1">
        {selectedComponent ? (
          <ComponentProperties component={selectedComponent} />
        ) : selectedSection ? (
          <SectionProperties section={selectedSection} />
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            <p>Pilih komponen atau section untuk mengedit propertinya</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
