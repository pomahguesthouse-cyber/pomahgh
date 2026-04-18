import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, ScanLine, CheckCircle2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiahID } from "@/utils/indonesianFormat";

interface OcrResult {
  is_payment_proof: boolean;
  confidence: "high" | "medium" | "low";
  amount: number | null;
  sender_name: string | null;
  bank_name: string | null;
  transfer_date: string | null;
  reference_number: string | null;
  notes: string | null;
}

export const OcrTestPanel = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Ukuran maksimum 5MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const runOcr = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ocr-payment-proof-test", {
        body: { image_data_url: preview },
      });
      if (fnError) throw fnError;
      if (!data?.extraction) throw new Error("Tidak ada hasil ekstraksi");
      setResult(data.extraction as OcrResult);
      toast.success("OCR selesai");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menjalankan OCR";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confidenceBadge = (c: string) => {
    if (c === "high") return <Badge className="bg-emerald-600">High</Badge>;
    if (c === "medium") return <Badge className="bg-amber-500">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> OCR Test — Bukti Transfer
          </CardTitle>
          <CardDescription>
            Upload bukti transfer untuk uji ekstraksi data secara langsung (Gemini Vision).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="proof-file">Pilih gambar bukti transfer</Label>
            <Input
              id="proof-file"
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: JPG/PNG/WebP, max 5MB
            </p>
          </div>

          {preview && (
            <div className="relative rounded-lg border bg-muted/30 p-2">
              <img src={preview} alt="preview" className="max-h-80 w-full object-contain rounded" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-3 right-3 h-7 w-7"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={runOcr} disabled={!file || loading} className="flex-1">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Jalankan OCR</>
              )}
            </Button>
            {(file || result) && (
              <Button variant="outline" onClick={reset} disabled={loading}>Reset</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result?.is_payment_proof ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            )}
            Hasil Ekstraksi
          </CardTitle>
          <CardDescription>
            JSON terstruktur dari OCR + financial parser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
              {error}
            </div>
          )}
          {!result && !error && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada hasil. Upload gambar dan jalankan OCR.
            </p>
          )}
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Menganalisa gambar…
            </div>
          )}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Bukti Transfer Valid?</span>
                {result.is_payment_proof ? (
                  <Badge className="bg-emerald-600">Ya</Badge>
                ) : (
                  <Badge variant="destructive">Bukan</Badge>
                )}
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Confidence</span>
                {confidenceBadge(result.confidence)}
              </div>
              <Field label="💵 Nominal" value={result.amount ? formatRupiahID(result.amount) : "—"} />
              <Field label="👤 Pengirim" value={result.sender_name ?? "—"} />
              <Field label="🏦 Bank / e-Wallet" value={result.bank_name ?? "—"} />
              <Field label="📅 Tanggal" value={result.transfer_date ?? "—"} />
              <Field label="#️⃣ Referensi" value={result.reference_number ?? "—"} />
              {result.notes && <Field label="📝 Catatan" value={result.notes} />}

              <details className="mt-3 pt-3 border-t">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Lihat JSON mentah
                </summary>
                <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 py-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-right">{value}</span>
  </div>
);
