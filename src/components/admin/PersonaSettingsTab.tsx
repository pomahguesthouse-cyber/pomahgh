import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bot, Sparkles, MessageCircle, Eye, X, Loader2 } from "lucide-react";
import { useChatbotSettings, useUpdateChatbotSettings } from "@/hooks/useChatbot";
import { useHotelSettings } from "@/hooks/useHotelSettings";

const PERSONA_TRAITS = [
  { value: "ramah", label: "Ramah", emoji: "😊" },
  { value: "profesional", label: "Profesional", emoji: "👔" },
  { value: "helpful", label: "Helpful", emoji: "🤝" },
  { value: "ceria", label: "Ceria", emoji: "🌟" },
  { value: "empati", label: "Empati Tinggi", emoji: "💕" },
  { value: "lucu", label: "Humoris", emoji: "😄" },
  { value: "sabar", label: "Sabar", emoji: "🧘" },
  { value: "informatif", label: "Informatif", emoji: "📚" },
  { value: "proaktif", label: "Proaktif", emoji: "🚀" },
  { value: "sopan", label: "Sopan", emoji: "🙏" },
];

const PERSONA_ROLES = [
  { value: "Customer Service", label: "Customer Service" },
  { value: "Concierge", label: "Concierge" },
  { value: "Resepsionis", label: "Resepsionis" },
  { value: "Asisten Virtual", label: "Asisten Virtual" },
  { value: "Reservation Agent", label: "Reservation Agent" },
];

const COMMUNICATION_STYLES = [
  { value: "formal", label: "Formal", desc: "Bahasa baku dan resmi" },
  { value: "semi-formal", label: "Semi-Formal", desc: "Sopan tapi tidak kaku" },
  { value: "santai-profesional", label: "Santai Profesional", desc: "Friendly tapi tetap pro" },
  { value: "casual", label: "Casual/Santai", desc: "Seperti teman" },
];

const EMOJI_OPTIONS = [
  { value: "none", label: "Tidak Ada", desc: "Tanpa emoji" },
  { value: "minimal", label: "Minimal", desc: "1-2 emoji per pesan" },
  { value: "moderate", label: "Moderat", desc: "2-3 emoji secukupnya" },
  { value: "expressive", label: "Ekspresif", desc: "Banyak emoji" },
];

const FORMALITY_OPTIONS = [
  { value: "formal", label: "Formal", desc: "Saya, Bapak/Ibu" },
  { value: "semi-formal", label: "Semi-Formal", desc: "Anda, Kak" },
  { value: "informal", label: "Informal", desc: "Kamu, Aku" },
];

export default function PersonaSettingsTab() {
  const { data: settings, isLoading } = useChatbotSettings();
  const { settings: hotelSettings } = useHotelSettings();
  const updateSettings = useUpdateChatbotSettings();

  const [formData, setFormData] = useState({
    persona_name: "Rani",
    persona_role: "Customer Service",
    persona_traits: ["ramah", "profesional", "helpful"] as string[],
    communication_style: "santai-profesional",
    emoji_usage: "moderate",
    language_formality: "semi-formal",
    custom_instructions: "",
    greeting_message: "",
    persona: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        persona_name: (settings as any).persona_name || "Rani",
        persona_role: (settings as any).persona_role || "Customer Service",
        persona_traits: (settings as any).persona_traits || ["ramah", "profesional", "helpful"],
        communication_style: (settings as any).communication_style || "santai-profesional",
        emoji_usage: (settings as any).emoji_usage || "moderate",
        language_formality: (settings as any).language_formality || "semi-formal",
        custom_instructions: (settings as any).custom_instructions || "",
        greeting_message: settings.greeting_message || "",
        persona: settings.persona || "",
      });
    }
  }, [settings]);

  const toggleTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      persona_traits: prev.persona_traits.includes(trait)
        ? prev.persona_traits.filter(t => t !== trait)
        : [...prev.persona_traits, trait]
    }));
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    await updateSettings.mutateAsync({
      id: settings.id,
      ...formData,
    });
  };

  // Generate preview response based on settings
  const getPreviewResponse = () => {
    const name = formData.persona_name || "Rani";
    const traits = formData.persona_traits;
    const style = formData.communication_style;
    const emoji = formData.emoji_usage;
    const formality = formData.language_formality;
    
    const emojiStr = emoji === "none" ? "" : emoji === "minimal" ? " 😊" : emoji === "moderate" ? " 😊👋" : " 😊👋✨";
    
    let greeting = "";
    if (formality === "formal") {
      greeting = `Selamat siang, Bapak/Ibu!${emojiStr}\n\nSaya ${name}, ${formData.persona_role} ${hotelSettings?.hotel_name || "hotel kami"}.`;
    } else if (formality === "semi-formal") {
      greeting = `Halo, Kak!${emojiStr}\n\nSaya ${name}, ${formData.persona_role} di ${hotelSettings?.hotel_name || "hotel kami"}.`;
    } else {
      greeting = `Hai!${emojiStr}\n\nAku ${name} dari ${hotelSettings?.hotel_name || "hotel kami"}.`;
    }

    let helpText = "";
    if (traits.includes("proaktif")) {
      helpText = " Mau cari kamar untuk tanggal berapa? Atau mau saya bantu lihat promo yang sedang berjalan?";
    } else if (traits.includes("helpful")) {
      helpText = " Ada yang bisa saya bantu hari ini?";
    } else {
      helpText = " Silakan sampaikan pertanyaan Anda.";
    }

    return greeting + helpText;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Settings Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <Bot className="w-5 h-5" />
              Identitas Bot
            </CardTitle>
            <CardDescription>Tentukan siapa chatbot Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="persona_name">Nama Bot</Label>
                <Input
                  id="persona_name"
                  value={formData.persona_name}
                  onChange={(e) => setFormData({ ...formData, persona_name: e.target.value })}
                  placeholder="Rani"
                />
              </div>
              <div>
                <Label htmlFor="persona_role">Peran</Label>
                <Select
                  value={formData.persona_role}
                  onValueChange={(value) => setFormData({ ...formData, persona_role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONA_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <Sparkles className="w-5 h-5" />
              Karakteristik
            </CardTitle>
            <CardDescription>Pilih sifat-sifat yang mencerminkan kepribadian bot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PERSONA_TRAITS.map((trait) => (
                <Badge
                  key={trait.value}
                  variant={formData.persona_traits.includes(trait.value) ? "default" : "outline"}
                  className="cursor-pointer text-sm py-1.5 px-3"
                  onClick={() => toggleTrait(trait.value)}
                >
                  {trait.emoji} {trait.label}
                  {formData.persona_traits.includes(trait.value) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <MessageCircle className="w-5 h-5" />
              Gaya Komunikasi
            </CardTitle>
            <CardDescription>Atur bagaimana bot berkomunikasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Gaya Bahasa</Label>
              <Select
                value={formData.communication_style}
                onValueChange={(value) => setFormData({ ...formData, communication_style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div className="flex flex-col">
                        <span>{style.label}</span>
                        <span className="text-xs text-muted-foreground">{style.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Penggunaan Emoji</Label>
                <Select
                  value={formData.emoji_usage}
                  onValueChange={(value) => setFormData({ ...formData, emoji_usage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOJI_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tingkat Formalitas</Label>
                <Select
                  value={formData.language_formality}
                  onValueChange={(value) => setFormData({ ...formData, language_formality: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-['Arial',Helvetica,sans-serif]">Instruksi Khusus</CardTitle>
            <CardDescription>Tambahkan aturan atau panduan khusus untuk bot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pesan Pembuka</Label>
              <Textarea
                value={formData.greeting_message}
                onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                placeholder="Halo! 👋 Ada yang bisa saya bantu?"
                rows={2}
              />
            </div>
            <div>
              <Label>Instruksi Tambahan (Opsional)</Label>
              <Textarea
                value={formData.custom_instructions}
                onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                placeholder="Contoh: Selalu tawarkan promo weekend setiap Jumat-Minggu..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Instruksi khusus yang akan ditambahkan ke prompt AI
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full" disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan Pengaturan Persona
        </Button>
      </div>

      {/* Live Preview */}
      <div className="space-y-6">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Arial',Helvetica,sans-serif]">
              <Eye className="w-5 h-5" />
              Preview Respons Bot
            </CardTitle>
            <CardDescription>Contoh bagaimana bot akan merespons dengan setting ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 space-y-4">
              {/* Bot Info */}
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {formData.persona_name?.charAt(0) || "R"}
                </div>
                <div>
                  <p className="font-medium">{formData.persona_name || "Rani"}</p>
                  <p className="text-xs text-muted-foreground">{formData.persona_role}</p>
                </div>
              </div>

              {/* Traits Display */}
              <div className="flex flex-wrap gap-1">
                {formData.persona_traits.map((trait) => {
                  const t = PERSONA_TRAITS.find(pt => pt.value === trait);
                  return t ? (
                    <span key={trait} className="text-xs bg-background px-2 py-0.5 rounded">
                      {t.emoji} {t.label}
                    </span>
                  ) : null;
                })}
              </div>

              <Separator />

              {/* Sample Conversation */}
              <div className="space-y-3">
                <div className="bg-primary/10 rounded-lg p-3 ml-8">
                  <p className="text-xs text-muted-foreground mb-1">Tamu bertanya:</p>
                  <p className="text-sm">"Halo, mau tanya soal kamar"</p>
                </div>

                <div className="bg-background rounded-lg p-3 mr-8 border">
                  <p className="text-xs text-muted-foreground mb-1">{formData.persona_name} menjawab:</p>
                  <p className="text-sm whitespace-pre-line">{getPreviewResponse()}</p>
                </div>
              </div>

              <Separator />

              {/* Style Summary */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Gaya:</strong> {COMMUNICATION_STYLES.find(s => s.value === formData.communication_style)?.label}</p>
                <p><strong>Emoji:</strong> {EMOJI_OPTIONS.find(e => e.value === formData.emoji_usage)?.label}</p>
                <p><strong>Formalitas:</strong> {FORMALITY_OPTIONS.find(f => f.value === formData.language_formality)?.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}