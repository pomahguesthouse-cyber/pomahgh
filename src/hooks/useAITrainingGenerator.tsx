import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedExample {
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  auto_generated?: boolean;
  is_active?: boolean;
}

export interface GapAnalysis {
  underrepresented_categories?: string[];
  missing_topics?: string[];
  recommendations?: string[];
  priority_gaps?: Array<{ topic: string; reason: string; suggested_count: number }>;
  raw?: string;
}

export interface ImprovedExample {
  improved_question?: string;
  improved_answer?: string;
  question_variants?: string[];
  improvement_notes?: string;
  raw?: string;
}

async function callTrainingGenerator(
  mode: string,
  params: Record<string, unknown> = {}
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesi login tidak valid');

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-generator`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ mode, ...params }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request gagal: ${res.status}`);
  }
  return res.json();
}

// ── Auto-approve pending generated examples ─────────────────────────────────

export function useApproveGeneratedExample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, table }: { id: string; table: 'chatbot_training_examples' | 'admin_chatbot_training_examples' }) => {
      const { error } = await supabase
        .from(table)
        .update({ is_active: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainingExamples'] });
      qc.invalidateQueries({ queryKey: ['pendingGeneratedExamples'] });
      toast.success('Contoh diaktifkan');
    },
  });
}

// ── Pending review query ────────────────────────────────────────────────────

export function usePendingGeneratedExamples(target: 'guest' | 'admin' = 'guest') {
  const table =
    target === 'admin'
      ? 'admin_chatbot_training_examples'
      : 'chatbot_training_examples';
  return useQuery({
    queryKey: ['pendingGeneratedExamples', target],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('is_active', false)
        .eq('auto_generated', true)
        .order('display_order', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as GeneratedExample[];
    },
  });
}

// ── Analyze gaps ────────────────────────────────────────────────────────────

export function useAnalyzeGaps(target: 'guest' | 'admin' = 'guest') {
  const [result, setResult] = useState<GapAnalysis | null>(null);

  const mutation = useMutation({
    mutationFn: () => callTrainingGenerator('analyze_gaps', { target }),
    onSuccess: (data: { analysis: GapAnalysis; model: string }) => {
      setResult(data.analysis);
      toast.success(`Analisis gap selesai (${data.model})`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menganalisis gap');
    },
  });

  return { ...mutation, result, clearResult: () => setResult(null) };
}

// ── Generate for category ───────────────────────────────────────────────────

export function useGenerateForCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      category,
      count = 5,
      target = 'guest',
    }: {
      category: string;
      count?: number;
      target?: 'guest' | 'admin';
    }) =>
      callTrainingGenerator('generate_for_category', { category, count, target }),
    onSuccess: (
      data: { generated: number; saved: number; pending_review: number; model: string },
      vars
    ) => {
      qc.invalidateQueries({ queryKey: ['pendingGeneratedExamples'] });
      toast.success(
        `${data.saved} contoh untuk "${vars.category}" digenerate — butuh review sebelum aktif`
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal generate contoh');
    },
  });
}

// ── Improve example ─────────────────────────────────────────────────────────

export function useImproveExample() {
  const [result, setResult] = useState<ImprovedExample | null>(null);

  const mutation = useMutation({
    mutationFn: (example: { question: string; answer: string; category?: string }) =>
      callTrainingGenerator('improve_example', { example }),
    onSuccess: (data: { improved: ImprovedExample; model: string }) => {
      setResult(data.improved);
      toast.success('Saran perbaikan siap');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal memperbaiki contoh');
    },
  });

  return { ...mutation, result, clearResult: () => setResult(null) };
}

// ── Analyze logs ────────────────────────────────────────────────────────────

export function useAnalyzeLogs() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => callTrainingGenerator('analyze_logs'),
    onSuccess: (data: { analyzed: number; total_saved: number; model: string }) => {
      qc.invalidateQueries({ queryKey: ['pendingGeneratedExamples'] });
      if (data.analyzed === 0) {
        toast.info('Tidak ada percakapan baru untuk dianalisis');
      } else {
        toast.success(
          `${data.analyzed} percakapan dianalisis → ${data.total_saved} contoh baru (butuh review)`
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal menganalisis log');
    },
  });
}
