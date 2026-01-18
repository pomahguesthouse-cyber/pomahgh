import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  history?: Message[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, history = [] }: RequestBody = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load all knowledge sources in parallel
    const [tokenTipsResult, templatesResult, snippetsResult, trainingResult] = await Promise.all([
      // Token Saver Tips
      supabase
        .from('admin_chatbot_knowledge_base')
        .select('title, content')
        .eq('category', 'token_saver')
        .eq('is_active', true),
      
      // Prompt Templates
      supabase
        .from('prompt_templates')
        .select('title, description, prompt_content, category'),
      
      // Code Snippets
      supabase
        .from('code_snippets')
        .select('title, description, language, category'),
      
      // Training Examples
      supabase
        .from('chatbot_training_examples')
        .select('question, ideal_answer, category')
        .eq('is_active', true)
    ]);

    // Format knowledge context
    const tokenTips = tokenTipsResult.data?.map(t => `### ${t.title}\n${t.content}`).join('\n\n') || '';
    
    const templates = templatesResult.data?.map(t => 
      `- **${t.title}** (${t.category}): ${t.description}`
    ).join('\n') || '';
    
    const snippets = snippetsResult.data?.map(s => 
      `- **${s.title}** [${s.language}] (${s.category}): ${s.description}`
    ).join('\n') || '';
    
    const trainingExamples = trainingResult.data?.slice(0, 5).map(e =>
      `Q: ${e.question}\nA: ${e.ideal_answer}`
    ).join('\n\n') || '';

    // Build system prompt
    const systemPrompt = `Kamu adalah **Prompt Engineering Consultant** untuk Lovable AI.

## KEAHLIAN UTAMA
- Menganalisis dan mengoptimalkan prompt yang tidak efisien
- Mengajarkan teknik menulis prompt yang hemat token
- Merekomendasikan template atau snippet yang sudah ada
- Memberikan contoh prompt yang efektif dan terstruktur

## PRINSIP HEMAT TOKEN

${tokenTips || `1. **Spesifik > Umum**: Sebutkan teknologi, file, komponen yang jelas
2. **Satu request = satu fokus**: Jangan gabungkan banyak request sekaligus
3. **Referensikan kode yang ada**: Daripada menjelaskan ulang, referensikan file/komponen
4. **Format terstruktur**: Gunakan bullet points untuk request kompleks
5. **Hindari kata ambigu**: Jangan gunakan "bagus", "cantik", "modern" tanpa definisi jelas`}

## TEMPLATE PROMPT YANG TERSEDIA
${templates || 'Tidak ada template tersedia.'}

## CODE SNIPPETS YANG TERSEDIA
${snippets || 'Tidak ada snippets tersedia.'}

## CONTOH INTERAKSI YANG BAIK
${trainingExamples || 'Tidak ada contoh tersedia.'}

## INSTRUKSI RESPONS
1. Jika user minta bantuan menulis prompt, analisis kebutuhannya secara detail
2. Rekomendasikan template yang sudah ada jika relevan (sebut nama template-nya)
3. Berikan contoh prompt yang terstruktur dengan format yang jelas
4. Jelaskan MENGAPA pendekatan tertentu lebih hemat token
5. Gunakan format markdown dengan emoji untuk keterbacaan
6. Berikan "before/after" jika memperbaiki prompt user

## FORMAT RESPONS IDEAL
- Gunakan ✅ untuk prompt yang baik
- Gunakan ❌ untuk contoh yang buruk
- Gunakan 💡 untuk tips tambahan
- Gunakan 📌 untuk rekomendasi template/snippet
- Gunakan emoji yang relevan untuk visual clarity

Respons dalam Bahasa Indonesia.`;

    // Build messages array for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        stream: true
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    // Return streaming response
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: unknown) {
    console.error('Prompt consultant error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
