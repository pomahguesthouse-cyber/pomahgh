-- Create code_snippets table
CREATE TABLE public.code_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  code_content TEXT NOT NULL,
  language TEXT DEFAULT 'typescript',
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admin only (using existing has_role function)
CREATE POLICY "Admins can manage code snippets" ON public.code_snippets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_code_snippets_updated_at
  BEFORE UPDATE ON public.code_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert starter code snippets
INSERT INTO public.code_snippets (title, description, code_content, language, category, tags) VALUES
(
  'Basic Card Component',
  'Template dasar untuk Card component dengan header dan content',
  E'import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";\n\nconst MyCard = () => {\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Judul Card</CardTitle>\n        <CardDescription>Deskripsi singkat card</CardDescription>\n      </CardHeader>\n      <CardContent>\n        <p>Konten card di sini...</p>\n      </CardContent>\n    </Card>\n  );\n};',
  'tsx',
  'component',
  ARRAY['card', 'ui', 'shadcn']
),
(
  'useLocalStorage Hook',
  'Custom hook untuk menyimpan dan mengambil data dari localStorage',
  E'import { useState, useEffect } from "react";\n\nexport function useLocalStorage<T>(key: string, initialValue: T) {\n  const [storedValue, setStoredValue] = useState<T>(() => {\n    try {\n      const item = window.localStorage.getItem(key);\n      return item ? JSON.parse(item) : initialValue;\n    } catch (error) {\n      console.error(error);\n      return initialValue;\n    }\n  });\n\n  const setValue = (value: T | ((val: T) => T)) => {\n    try {\n      const valueToStore = value instanceof Function ? value(storedValue) : value;\n      setStoredValue(valueToStore);\n      window.localStorage.setItem(key, JSON.stringify(valueToStore));\n    } catch (error) {\n      console.error(error);\n    }\n  };\n\n  return [storedValue, setValue] as const;\n}',
  'typescript',
  'hook',
  ARRAY['localStorage', 'hook', 'state']
),
(
  'Format Rupiah',
  'Utility function untuk format angka ke format Rupiah Indonesia',
  E'export const formatRupiah = (amount: number): string => {\n  return new Intl.NumberFormat("id-ID", {\n    style: "currency",\n    currency: "IDR",\n    minimumFractionDigits: 0,\n    maximumFractionDigits: 0,\n  }).format(amount);\n};\n\n// Contoh penggunaan:\n// formatRupiah(150000) -> "Rp150.000"',
  'typescript',
  'utility',
  ARRAY['format', 'currency', 'rupiah']
),
(
  'Toast Notification',
  'Pattern untuk menampilkan toast notification menggunakan shadcn',
  E'import { useToast } from "@/hooks/use-toast";\n\nconst MyComponent = () => {\n  const { toast } = useToast();\n\n  const showSuccess = () => {\n    toast({\n      title: "Berhasil!",\n      description: "Data berhasil disimpan.",\n    });\n  };\n\n  const showError = () => {\n    toast({\n      title: "Error",\n      description: "Terjadi kesalahan. Silakan coba lagi.",\n      variant: "destructive",\n    });\n  };\n\n  return <button onClick={showSuccess}>Simpan</button>;\n};',
  'tsx',
  'utility',
  ARRAY['toast', 'notification', 'shadcn']
),
(
  'Supabase Select Query',
  'Pattern untuk query data dari Supabase dengan error handling',
  E'import { supabase } from "@/integrations/supabase/client";\nimport { useQuery } from "@tanstack/react-query";\n\nexport const useMyData = () => {\n  return useQuery({\n    queryKey: ["my-data"],\n    queryFn: async () => {\n      const { data, error } = await supabase\n        .from("my_table")\n        .select("*")\n        .order("created_at", { ascending: false });\n\n      if (error) throw error;\n      return data;\n    },\n  });\n};',
  'typescript',
  'api',
  ARRAY['supabase', 'query', 'react-query']
),
(
  'RLS Admin Only Policy',
  'Template RLS policy untuk akses admin only',
  E'-- Enable RLS pada tabel\nALTER TABLE public.nama_tabel ENABLE ROW LEVEL SECURITY;\n\n-- Policy: Hanya admin yang bisa akses\nCREATE POLICY "Admins can manage nama_tabel" ON public.nama_tabel\n  FOR ALL TO authenticated\n  USING (public.has_role(auth.uid(), ''admin''))\n  WITH CHECK (public.has_role(auth.uid(), ''admin''));',
  'sql',
  'database',
  ARRAY['rls', 'policy', 'admin', 'security']
),
(
  'Tailwind Responsive Grid',
  'Pattern untuk grid responsive dengan Tailwind CSS',
  E'<!-- Grid 1-2-3 columns responsive -->\n<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n  <div>Item 1</div>\n  <div>Item 2</div>\n  <div>Item 3</div>\n</div>\n\n<!-- Grid dengan auto-fit -->\n<div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">\n  <div>Item responsive</div>\n</div>',
  'html',
  'styling',
  ARRAY['grid', 'responsive', 'tailwind']
),
(
  'Form dengan React Hook Form',
  'Template form menggunakan React Hook Form dengan validasi Zod',
  E'import { useForm } from "react-hook-form";\nimport { zodResolver } from "@hookform/resolvers/zod";\nimport * as z from "zod";\nimport { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";\nimport { Input } from "@/components/ui/input";\nimport { Button } from "@/components/ui/button";\n\nconst formSchema = z.object({\n  name: z.string().min(2, "Nama minimal 2 karakter"),\n  email: z.string().email("Email tidak valid"),\n});\n\nconst MyForm = () => {\n  const form = useForm<z.infer<typeof formSchema>>({\n    resolver: zodResolver(formSchema),\n    defaultValues: { name: "", email: "" },\n  });\n\n  const onSubmit = (values: z.infer<typeof formSchema>) => {\n    console.log(values);\n  };\n\n  return (\n    <Form {...form}>\n      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">\n        <FormField\n          control={form.control}\n          name="name"\n          render={({ field }) => (\n            <FormItem>\n              <FormLabel>Nama</FormLabel>\n              <FormControl>\n                <Input {...field} />\n              </FormControl>\n              <FormMessage />\n            </FormItem>\n          )}\n        />\n        <Button type="submit">Submit</Button>\n      </form>\n    </Form>\n  );\n};',
  'tsx',
  'component',
  ARRAY['form', 'validation', 'zod', 'react-hook-form']
),
(
  'Edge Function Template',
  'Template dasar untuk Supabase Edge Function',
  E'import { serve } from "https://deno.land/std@0.168.0/http/server.ts";\nimport { createClient } from "https://esm.sh/@supabase/supabase-js@2";\n\nconst corsHeaders = {\n  "Access-Control-Allow-Origin": "*",\n  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",\n};\n\nserve(async (req) => {\n  if (req.method === "OPTIONS") {\n    return new Response(null, { headers: corsHeaders });\n  }\n\n  try {\n    const supabase = createClient(\n      Deno.env.get("SUPABASE_URL") ?? "",\n      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""\n    );\n\n    const { data } = await req.json();\n\n    // Your logic here\n\n    return new Response(\n      JSON.stringify({ success: true }),\n      { headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n  } catch (error) {\n    return new Response(\n      JSON.stringify({ error: error.message }),\n      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }\n    );\n  }\n});',
  'typescript',
  'api',
  ARRAY['edge-function', 'supabase', 'deno']
),
(
  'Date Format Indonesia',
  'Utility function untuk format tanggal ke format Indonesia',
  E'export const formatDateID = (date: Date | string): string => {\n  const d = typeof date === "string" ? new Date(date) : date;\n  return new Intl.DateTimeFormat("id-ID", {\n    weekday: "long",\n    year: "numeric",\n    month: "long",\n    day: "numeric",\n  }).format(d);\n};\n\nexport const formatDateTimeID = (date: Date | string): string => {\n  const d = typeof date === "string" ? new Date(date) : date;\n  return new Intl.DateTimeFormat("id-ID", {\n    dateStyle: "long",\n    timeStyle: "short",\n  }).format(d);\n};\n\n// Contoh:\n// formatDateID(new Date()) -> "Sabtu, 18 Januari 2025"\n// formatDateTimeID(new Date()) -> "18 Januari 2025 14.30"',
  'typescript',
  'utility',
  ARRAY['date', 'format', 'indonesia']
);

-- Insert starter prompt templates (if table exists and is empty)
INSERT INTO public.prompt_templates (title, description, prompt_content, category, tags) VALUES
(
  'Tambah Page Baru',
  'Template untuk meminta pembuatan page admin baru',
  E'Buatkan page baru di `/admin/[nama-page]` dengan layout AdminLayout.\n\nFitur yang dibutuhkan:\n- [Deskripsi fitur 1]\n- [Deskripsi fitur 2]\n- [Deskripsi fitur 3]\n\nGunakan komponen UI dari shadcn/ui dan ikuti pattern yang sudah ada di project.',
  'feature_add',
  ARRAY['page', 'admin', 'create']
),
(
  'Fix TypeScript Error',
  'Template untuk meminta perbaikan error TypeScript',
  E'Perbaiki TypeScript error di file `[path/to/file.tsx]`.\n\nError message:\n```\n[paste error message here]\n```\n\nPastikan tidak mengubah fungsionalitas yang ada.',
  'bug_fix',
  ARRAY['typescript', 'error', 'fix']
),
(
  'Tambah Kolom Database',
  'Template untuk menambah kolom baru ke tabel',
  E'Tambahkan kolom baru ke tabel `[nama_tabel]`:\n\n- Nama kolom: `[nama_kolom]`\n- Tipe data: `[TEXT/INTEGER/BOOLEAN/UUID/TIMESTAMPTZ/etc]`\n- Default value: `[nilai default atau NULL]`\n- Nullable: `[Ya/Tidak]`\n\nJuga update RLS policy jika diperlukan.',
  'database',
  ARRAY['database', 'migration', 'column']
),
(
  'Update Styling Component',
  'Template untuk meminta perubahan styling',
  E'Update styling pada komponen `[NamaKomponen]` di file `[path/to/file.tsx]`.\n\nPerubahan yang diminta:\n- [Perubahan 1]\n- [Perubahan 2]\n\nGunakan Tailwind CSS dan pastikan responsive di mobile.',
  'styling',
  ARRAY['styling', 'css', 'tailwind']
),
(
  'Buat Edge Function',
  'Template untuk meminta pembuatan edge function baru',
  E'Buatkan edge function baru dengan nama `[nama-function]`.\n\nTujuan: [Deskripsi tujuan function]\n\nInput:\n```json\n{\n  "field1": "type",\n  "field2": "type"\n}\n```\n\nOutput yang diharapkan:\n```json\n{\n  "success": true,\n  "data": { ... }\n}\n```\n\nTambahkan error handling dan validasi input.',
  'api',
  ARRAY['edge-function', 'api', 'backend']
),
(
  'Tambah CRUD Hook',
  'Template untuk meminta pembuatan custom hook CRUD',
  E'Buatkan custom hook `use[NamaHook]` untuk CRUD operasi pada tabel `[nama_tabel]`.\n\nFitur yang dibutuhkan:\n- `useQuery` untuk fetch data dengan filter dan search\n- `useMutation` untuk add/create\n- `useMutation` untuk update\n- `useMutation` untuk delete\n\nGunakan react-query dan ikuti pattern hooks yang sudah ada.',
  'feature_add',
  ARRAY['hook', 'crud', 'react-query']
),
(
  'Refactor Component',
  'Template untuk meminta refactor komponen',
  E'Refactor komponen `[NamaKomponen]` di `[path/to/file.tsx]`.\n\nTujuan refactor:\n- [Tujuan 1: misal split menjadi komponen lebih kecil]\n- [Tujuan 2: misal improve performance]\n- [Tujuan 3: misal better code organization]\n\nPastikan tidak mengubah fungsionalitas yang ada dan test masih passed.',
  'refactor',
  ARRAY['refactor', 'clean-code', 'optimization']
),
(
  'Implementasi RLS Policy',
  'Template untuk meminta pembuatan RLS policy',
  E'Buatkan RLS policy untuk tabel `[nama_tabel]`.\n\nAkses yang diizinkan:\n- SELECT: [siapa yang boleh read, contoh: semua user authenticated / hanya owner / hanya admin]\n- INSERT: [siapa yang boleh create]\n- UPDATE: [siapa yang boleh update]\n- DELETE: [siapa yang boleh delete]\n\nGunakan function `has_role()` yang sudah ada jika perlu check role.',
  'database',
  ARRAY['rls', 'policy', 'security', 'database']
)
ON CONFLICT DO NOTHING;