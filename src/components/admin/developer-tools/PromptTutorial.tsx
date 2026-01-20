import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  AlertTriangle, 
  CheckCircle2,
  Zap,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TutorialExample {
  id: number;
  title: string;
  scenario: string;
  before: {
    prompt: string;
    issues: string[];
    estimatedTokens: number;
    iterations: number;
    totalCredits: number;
  };
  after: {
    prompt: string;
    improvements: string[];
    estimatedTokens: number;
    iterations: number;
    totalCredits: number;
  };
  savings: string;
}

const TUTORIAL_EXAMPLES: TutorialExample[] = [
  {
    id: 1,
    title: "Membuat Form Login",
    scenario: "User ingin membuat halaman login dengan validasi",
    before: {
      prompt: "buatkan form login",
      issues: [
        "Tidak spesifik teknologi",
        "Tidak ada requirement validasi",
        "Tidak ada konteks integrasi"
      ],
      estimatedTokens: 2000,
      iterations: 3,
      totalCredits: 6000
    },
    after: {
      prompt: `Buat form login dengan email dan password menggunakan React Hook Form + Zod validation. Gunakan komponen dari shadcn/ui (Input, Button, Form). Tambahkan:
- Error handling untuk input invalid
- Loading state saat submit
- Integrasikan dengan Supabase Auth signInWithPassword`,
      improvements: [
        "Teknologi spesifik (React Hook Form, Zod)",
        "Komponen UI jelas (shadcn/ui)",
        "Fitur lengkap disebutkan"
      ],
      estimatedTokens: 2500,
      iterations: 1,
      totalCredits: 2500
    },
    savings: "58%"
  },
  {
    id: 2,
    title: "Menambah Fitur Dark Mode",
    scenario: "User ingin menambahkan toggle dark mode ke aplikasi",
    before: {
      prompt: "tambahkan dark mode",
      issues: [
        "Tidak ada lokasi komponen",
        "Tidak jelas persistensi",
        "Tidak ada referensi icon"
      ],
      estimatedTokens: 1500,
      iterations: 4,
      totalCredits: 6000
    },
    after: {
      prompt: `Tambahkan toggle dark mode di Header.tsx menggunakan next-themes yang sudah terinstall. 
- Simpan preferensi ke localStorage
- Gunakan icon Sun/Moon dari lucide-react
- Posisikan di sebelah kanan navigation menu
- Animasi smooth saat transisi tema`,
      improvements: [
        "Lokasi komponen spesifik",
        "Library yang digunakan jelas",
        "Detail implementasi lengkap"
      ],
      estimatedTokens: 1800,
      iterations: 1,
      totalCredits: 1800
    },
    savings: "70%"
  },
  {
    id: 3,
    title: "Membuat Tabel dengan Pagination",
    scenario: "User ingin menampilkan data booking dalam tabel yang bisa di-filter",
    before: {
      prompt: "tampilkan data booking di tabel",
      issues: [
        "Tidak ada spesifikasi kolom",
        "Tidak ada sorting/filter",
        "Tidak ada pagination"
      ],
      estimatedTokens: 3000,
      iterations: 5,
      totalCredits: 15000
    },
    after: {
      prompt: `Buat tabel booking di AdminBookings.tsx dengan kolom:
- Nama tamu, tanggal check-in/out, nama kamar, status, total harga

Fitur yang dibutuhkan:
- Pagination 10 item per halaman
- Sorting by tanggal check-in (asc/desc)
- Filter by status: pending, confirmed, cancelled
- Loading skeleton saat fetch data
- Gunakan shadcn/ui Table dan Pagination components`,
      improvements: [
        "Kolom tabel spesifik",
        "Semua fitur disebutkan",
        "Komponen UI yang digunakan jelas"
      ],
      estimatedTokens: 4000,
      iterations: 1,
      totalCredits: 4000
    },
    savings: "73%"
  },
  {
    id: 4,
    title: "Menambah Notifikasi Real-time",
    scenario: "User ingin menerima notifikasi saat ada booking baru",
    before: {
      prompt: "buat notifikasi booking",
      issues: [
        "Tidak jelas tipe notifikasi",
        "Tidak ada trigger spesifik",
        "Tidak ada UI requirement"
      ],
      estimatedTokens: 2500,
      iterations: 4,
      totalCredits: 10000
    },
    after: {
      prompt: `Buat sistem notifikasi real-time untuk booking baru:

Backend (Edge Function):
- Trigger saat INSERT ke tabel bookings
- Kirim data: booking_code, guest_name, room_name

Frontend:
- Gunakan Supabase Realtime untuk subscribe ke channel
- Tampilkan toast notification dengan sonner
- Badge counter di icon Bell di header
- Klik icon untuk lihat list notifikasi terbaru`,
      improvements: [
        "Backend dan frontend terpisah jelas",
        "Trigger dan data spesifik",
        "UI behavior lengkap"
      ],
      estimatedTokens: 3500,
      iterations: 1,
      totalCredits: 3500
    },
    savings: "65%"
  }
];

export function PromptTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const example = TUTORIAL_EXAMPLES[currentStep];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(example.after.prompt);
    setCopied(true);
    toast.success("Prompt template berhasil disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(TUTORIAL_EXAMPLES.length - 1, prev + 1));
  };

  const creditsSaved = example.before.totalCredits - example.after.totalCredits;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tutorial: Hemat Credit dengan Prompt Template
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pelajari cara menulis prompt yang efektif untuk menghemat credit Lovable
          </p>
        </CardHeader>
      </Card>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {TUTORIAL_EXAMPLES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300",
              index === currentStep
                ? "w-8 bg-primary"
                : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Scenario Title */}
      <div className="text-center">
        <Badge variant="secondary" className="mb-2">
          Contoh {currentStep + 1} dari {TUTORIAL_EXAMPLES.length}
        </Badge>
        <h3 className="text-xl font-semibold">{example.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{example.scenario}</p>
      </div>

      {/* Before/After Comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Before Card */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              ❌ BEFORE (Prompt Buruk)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background/80 rounded-lg p-3 border border-destructive/20">
              <p className="text-sm font-mono italic text-muted-foreground">
                "{example.before.prompt}"
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-destructive mb-2">⚠️ Masalah:</p>
              <ul className="space-y-1">
                {example.before.issues.map((issue, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-destructive mt-0.5">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-destructive/20">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Iterasi:</span> {example.before.iterations}x
              </div>
              <Badge variant="destructive" className="text-xs">
                💰 ~{example.before.totalCredits.toLocaleString()} credits
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* After Card */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              ✅ AFTER (Prompt Optimal)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-background/80 rounded-lg p-3 border border-green-500/20">
              <p className="text-sm font-mono whitespace-pre-wrap text-foreground">
                {example.after.prompt}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">✅ Keunggulan:</p>
              <ul className="space-y-1">
                {example.after.improvements.map((improvement, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Iterasi:</span> {example.after.iterations}x
              </div>
              <Badge className="text-xs bg-green-600 hover:bg-green-700">
                💰 ~{example.after.totalCredits.toLocaleString()} credits
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Summary */}
      <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">
              Anda menghemat: <span className="text-primary">{example.savings}</span>
            </span>
            <Badge variant="outline" className="border-primary text-primary">
              ~{creditsSaved.toLocaleString()} credits
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Sebelumnya
        </Button>

        <Button onClick={handleCopy} className="gap-2">
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Tersalin!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Prompt Template
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentStep === TUTORIAL_EXAMPLES.length - 1}
          className="gap-1"
        >
          Selanjutnya
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tips Box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            💡 <strong>Tips:</strong> Prompt yang baik menyebutkan teknologi spesifik, lokasi file, 
            dan fitur lengkap yang diinginkan. Ini mengurangi iterasi dan menghemat credit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}












