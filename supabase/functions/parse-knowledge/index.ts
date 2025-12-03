import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url') as string | null;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string || 'general';

    let content = '';
    let sourceType = '';
    let sourceUrl = '';
    let originalFilename = '';

    if (file) {
      // Handle file upload
      const filename = file.name.toLowerCase();
      originalFilename = file.name;
      
      if (filename.endsWith('.txt')) {
        sourceType = 'txt';
        content = await file.text();
      } else if (filename.endsWith('.pdf')) {
        sourceType = 'pdf';
        // For PDF, we'll extract text using a simple approach
        // Note: For production, consider using pdf-parse or similar
        const arrayBuffer = await file.arrayBuffer();
        content = await extractTextFromPDF(arrayBuffer);
      } else if (filename.endsWith('.docx')) {
        sourceType = 'word';
        const arrayBuffer = await file.arrayBuffer();
        content = await extractTextFromDocx(arrayBuffer);
      } else if (filename.endsWith('.doc')) {
        sourceType = 'word';
        // .doc files are harder to parse, we'll try basic extraction
        content = await file.text();
      } else {
        throw new Error('Unsupported file type. Supported: PDF, DOCX, TXT');
      }

      // Upload to storage
      const storagePath = `${Date.now()}-${originalFilename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('knowledge-base')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Continue without storage URL
      } else {
        sourceUrl = storagePath;
      }
    } else if (url) {
      // Handle URL scraping
      sourceType = 'url';
      sourceUrl = url;
      content = await fetchUrlContent(url);
    } else {
      throw new Error('Either file or URL is required');
    }

    // Clean and truncate content if too long
    content = cleanContent(content);
    const tokensCount = Math.ceil(content.length / 4); // Rough token estimate

    // Save to database
    const { data: knowledge, error: dbError } = await supabase
      .from('chatbot_knowledge_base')
      .insert({
        title,
        source_type: sourceType,
        source_url: sourceUrl,
        original_filename: originalFilename || null,
        content,
        category,
        tokens_count: tokensCount,
        is_active: true
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save knowledge: ' + dbError.message);
    }

    console.log(`Knowledge base entry created: ${title}, ${tokensCount} tokens`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        knowledge,
        message: `Successfully parsed ${sourceType}: ${content.length} characters`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse knowledge error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extract text from PDF (basic implementation)
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Convert to string and extract visible text
    const bytes = new Uint8Array(arrayBuffer);
    let text = '';
    
    // Simple text extraction from PDF stream
    const str = new TextDecoder('latin1').decode(bytes);
    
    // Look for text between BT and ET markers (text blocks)
    const matches = str.match(/BT[\s\S]*?ET/g) || [];
    
    for (const match of matches) {
      // Extract text from Tj and TJ operators
      const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g) || [];
      for (const tj of tjMatches) {
        const textMatch = tj.match(/\(([^)]*)\)/);
        if (textMatch) {
          text += textMatch[1] + ' ';
        }
      }
    }
    
    // Also try to find plain text streams
    const streamMatches = str.match(/stream[\s\S]*?endstream/g) || [];
    for (const stream of streamMatches) {
      // Try to decode and extract readable text
      const readable = stream.replace(/stream|endstream/g, '')
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (readable.length > 20 && readable.length < 10000) {
        text += readable + '\n';
      }
    }
    
    if (text.trim().length < 100) {
      // Fallback: extract any readable text
      text = str.replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 50000);
    }
    
    return text.trim() || 'Unable to extract text from PDF. Please try TXT format.';
  } catch (e) {
    console.error('PDF extraction error:', e);
    return 'PDF extraction failed. Please upload as TXT.';
  }
}

// Extract text from DOCX
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // DOCX is a ZIP file containing XML
    // We'll try to find and extract text from document.xml
    const bytes = new Uint8Array(arrayBuffer);
    const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Look for XML content
    const textMatches = str.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    let text = '';
    
    for (const match of textMatches) {
      const content = match.replace(/<[^>]+>/g, '');
      text += content + ' ';
    }
    
    if (text.trim().length < 50) {
      // Fallback: extract any readable text
      text = str.replace(/<[^>]+>/g, ' ')
        .replace(/[^\x20-\x7E\n\r]/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 50000);
    }
    
    return text.trim() || 'Unable to extract text from DOCX. Please try TXT format.';
  } catch (e) {
    console.error('DOCX extraction error:', e);
    return 'DOCX extraction failed. Please upload as TXT.';
  }
}

// Fetch and extract content from URL
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Remove script, style, and other non-content tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    // Extract text from common content tags
    const mainContent = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
                       text.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
                       text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ||
                       text;
    
    // Strip remaining HTML tags
    text = mainContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text.substring(0, 50000) || 'Unable to extract content from URL';
  } catch (e) {
    console.error('URL fetch error:', e);
    throw new Error(`Failed to fetch URL content: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// Clean and normalize content
function cleanContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\n\rÀ-ÿ]/g, '')
    .trim()
    .substring(0, 100000); // Limit to 100K characters
}
