import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: track messages per phone number
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(phone);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Normalize phone number to standard format
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\D/g, '');
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.slice(1);
  }
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  return normalized;
}

// Indonesian slang normalizer for better AI understanding
function normalizeIndonesianMessage(msg: string): string {
  const slangMap: Record<string, string> = {
    'dlx': 'deluxe', 'delux': 'deluxe', 'dluxe': 'deluxe',
    'grnd': 'grand', 'grd': 'grand',
    'fam': 'family', 'fmly': 'family',
    'sgl': 'single', 'sngl': 'single',
    'kmr': 'kamar', 'kmar': 'kamar',
    'brp': 'berapa', 'brapa': 'berapa',
    'bs': 'bisa', 'bsa': 'bisa', 'bza': 'bisa',
    'gk': 'tidak', 'ga': 'tidak', 'ngga': 'tidak', 'gak': 'tidak', 'nggak': 'tidak',
    'sy': 'saya', 'aku': 'saya', 'ak': 'saya', 'gw': 'saya', 'gue': 'saya',
    'mlm': 'malam', 'malem': 'malam',
    'org': 'orang', 'orng': 'orang',
    'tgl': 'tanggal', 'tggl': 'tanggal',
    'kpn': 'kapan', 'kapn': 'kapan',
    'bsk': 'besok', 'besuk': 'besok',
    'lsa': 'lusa',
    'gmn': 'bagaimana', 'gimana': 'bagaimana', 'gmna': 'bagaimana',
    'udh': 'sudah', 'udah': 'sudah', 'sdh': 'sudah',
    'blm': 'belum', 'blum': 'belum',
    'yg': 'yang', 'yng': 'yang',
    'dg': 'dengan', 'dgn': 'dengan',
    'utk': 'untuk', 'utuk': 'untuk', 'buat': 'untuk',
    'krn': 'karena', 'krna': 'karena',
    'lg': 'lagi', 'lgi': 'lagi',
    'msh': 'masih', 'msih': 'masih',
    'jg': 'juga', 'jga': 'juga',
    'tp': 'tapi', 'tpi': 'tapi',
    'sm': 'sama', 'ama': 'sama',
    'trims': 'terima kasih', 'tq': 'terima kasih', 'makasih': 'terima kasih', 'mksh': 'terima kasih',
  };
  
  let normalized = msg.toLowerCase();
  for (const [slang, replacement] of Object.entries(slangMap)) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    normalized = normalized.replace(regex, replacement);
  }
  
  return normalized;
}

// Format AI response for WhatsApp compatibility
function formatForWhatsApp(text: string): string {
  text = text.replace(/\|[^\n]+\|/g, '');
  text = text.replace(/\|-+\|/g, '');
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
  text = text.replace(/^###?\s*(.+)$/gm, '*$1*');
  text = text.replace(/\n{3,}/g, '\n\n');
  
  if (text.length > 4000) {
    text = text.substring(0, 3997) + '...';
  }
  
  return text.trim();
}

// Helper: Convert Indonesian month to number
function indonesianMonthToNumber(month: string): number {
  const months: Record<string, number> = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
    'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
  };
  return months[month.toLowerCase()] || 1;
}

// Helper: Convert Indonesian date to ISO format (YYYY-MM-DD) with smart year inference
function indonesianDateToISO(day: string, month: string, year: string): string {
  const monthNum = indonesianMonthToNumber(month);
  const dayNum = parseInt(day);
  let yearNum = parseInt(year);
  
  // Create the target date
  const targetDate = new Date(yearNum, monthNum - 1, dayNum);
  
  // Get today's date (WIB)
  const now = new Date();
  const wibOffset = 7 * 60;
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  const today = new Date(wibTime.getFullYear(), wibTime.getMonth(), wibTime.getDate());
  
  // CRITICAL: If date is in the PAST, add 1 year
  // Example: In December 2025, "January 2025" should become "January 2026"
  if (targetDate < today) {
    yearNum += 1;
    console.warn(`⚠️ Date ${day} ${month} ${year} is in the past, correcting to ${yearNum}`);
  }
  
  return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
}

// Extract conversation context from message history for booking continuation
function extractConversationContext(messages: Array<{role: string, content: string}>): any {
  const context: any = {};
  
  // Scan messages from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    
    if (msg.role === 'assistant') {
      // Extract room name from availability responses - MORE FLEXIBLE PATTERNS
      if (!context.preferred_room) {
        const roomPatterns = [
          // "Untuk Family Suite, tersedia" - with comma
          /[Uu]ntuk\s+(Single|Deluxe|Grand Deluxe|Family Suite),?\s*(tersedia|available)/i,
          // "Family Suite tersedia" or "Family Suite, tersedia"
          /(Single|Deluxe|Grand Deluxe|Family Suite),?\s*(tersedia|available)/i,
          // "Family Suite untuk check-in"
          /(Single|Deluxe|Grand Deluxe|Family Suite)\s+untuk\s+check-?in/i,
          // "kamar Family Suite" or "tipe Family Suite"
          /(?:kamar|tipe|room)\s+(Single|Deluxe|Grand Deluxe|Family Suite)/i,
          // "booking Family Suite" or "pesan Family Suite"
          /(?:booking|pesan|book)\s+(Single|Deluxe|Grand Deluxe|Family Suite)/i,
        ];
        for (const pattern of roomPatterns) {
          const match = msg.content.match(pattern);
          if (match) {
            context.preferred_room = match[1];
            console.log(`Found room from pattern: ${match[0]} -> ${match[1]}`);
            break;
          }
        }
      }
      
      // Extract dates from availability responses - IMPROVED PATTERNS
      if (!context.check_in_date || !context.check_out_date) {
        const monthPattern = '(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)';
        
        // Pattern 1: "16 Desember 2025, sampai 18 Desember 2025" (with comma before sampai)
        const fullDateRangeRegex = new RegExp(
          `(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4}),?\\s*(?:sampai|hingga|s\\.?d\\.?|ke|-)\\s*(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`,
          'i'
        );
        const fullMatch = msg.content.match(fullDateRangeRegex);
        if (fullMatch) {
          context.check_in_date = indonesianDateToISO(fullMatch[1], fullMatch[2], fullMatch[3]);
          context.check_out_date = indonesianDateToISO(fullMatch[4], fullMatch[5], fullMatch[6]);
          context.dates_mentioned = fullMatch[0];
          console.log(`Found dates (full): ${fullMatch[0]} -> ${context.check_in_date} to ${context.check_out_date}`);
        }
        
        // Pattern 2: "16-18 Desember 2025" (same month)
        if (!context.check_in_date) {
          const shortDateRangeRegex = new RegExp(
            `(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`,
            'i'
          );
          const shortMatch = msg.content.match(shortDateRangeRegex);
          if (shortMatch) {
            context.check_in_date = indonesianDateToISO(shortMatch[1], shortMatch[3], shortMatch[4]);
            context.check_out_date = indonesianDateToISO(shortMatch[2], shortMatch[3], shortMatch[4]);
            context.dates_mentioned = shortMatch[0];
            console.log(`Found dates (short): ${shortMatch[0]} -> ${context.check_in_date} to ${context.check_out_date}`);
          }
        }
        
        // Pattern 3: Single date with "check-in" keyword
        if (!context.check_in_date) {
          const checkInRegex = new RegExp(
            `check-?in[:\\s]+(\\d{1,2})\\s+${monthPattern}\\s+(\\d{4})`,
            'i'
          );
          const checkInMatch = msg.content.match(checkInRegex);
          if (checkInMatch) {
            context.check_in_date = indonesianDateToISO(checkInMatch[1], checkInMatch[2], checkInMatch[3]);
            console.log(`Found check-in date: ${checkInMatch[0]} -> ${context.check_in_date}`);
          }
        }
      }
      
      // Check if AI asked for guest data - MORE FLEXIBLE PATTERNS
      if (!context.awaiting_guest_data) {
        const guestDataPatterns = [
          /mohon\s+informasikan/i,        // "mohon informasikan:"
          /mohon\s+info/i,                 // "mohon info"
          /nama\s+lengkap.*anda/i,         // "Nama lengkap Anda"
          /data\s+(untuk\s+)?booking/i,    // "data untuk booking"
          /nama.*email.*(?:hp|nomor|telepon|whatsapp)/i,  // "nama, email, hp"
          /silakan\s+(?:berikan|kirim).*data/i,           // "silakan berikan data"
          /butuh.*(?:nama|data|informasi)/i,              // "butuh nama/data"
        ];
        for (const pattern of guestDataPatterns) {
          if (pattern.test(msg.content)) {
            context.awaiting_guest_data = true;
            console.log(`Found awaiting_guest_data from pattern: ${pattern}`);
            break;
          }
        }
      }
    }
    
    // Also check user messages for room preferences
    if (msg.role === 'user' && !context.preferred_room) {
      const userRoomMatch = msg.content.match(/(single|deluxe|grand\s*deluxe|family\s*suite)/i);
      if (userRoomMatch) {
        context.preferred_room = userRoomMatch[1].replace(/\s+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`Found room from user message: ${userRoomMatch[0]} -> ${context.preferred_room}`);
      }
    }
  }
  
  console.log("Extracted conversation context:", JSON.stringify(context));
  return Object.keys(context).length > 0 ? context : null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET request for webhook verification
  if (req.method === 'GET') {
    console.log("Webhook verification GET request received");
    return new Response(JSON.stringify({ 
      status: "ok", 
      message: "WhatsApp webhook is active",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FONNTE_API_KEY = Deno.env.get("FONNTE_API_KEY");

    if (!FONNTE_API_KEY) {
      throw new Error("FONNTE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming webhook
    let body: any;
    const contentType = req.headers.get('content-type') || '';
    console.log("Request content-type:", contentType);

    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        const text = await req.text();
        if (!text || text.trim() === '') {
          return new Response(JSON.stringify({ status: "skipped", reason: "empty body" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        try {
          body = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        }
      }
    } catch (parseError) {
      console.error("Body parse error:", parseError);
      return new Response(JSON.stringify({ status: "error", reason: "invalid body format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Parsed webhook body:", JSON.stringify(body));

    const { sender, message } = body;

    if (!sender || !message) {
      console.log("Missing sender or message, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no sender or message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizePhone(sender);
    console.log(`Processing message from ${phone}: "${message}"`);
    
    // Normalize message for AI
    const normalizedMessage = normalizeIndonesianMessage(message);
    console.log(`Normalized message: "${normalizedMessage}"`);

    // Check rate limit
    if (!checkRateLimit(phone)) {
      console.log(`Rate limited: ${phone}`);
      return new Response(JSON.stringify({ status: "rate_limited" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get hotel settings
    const { data: hotelSettings } = await supabase
      .from('hotel_settings')
      .select('whatsapp_session_timeout_minutes, whatsapp_ai_whitelist, whatsapp_response_mode, whatsapp_manager_numbers')
      .single();
    
    const sessionTimeoutMinutes = hotelSettings?.whatsapp_session_timeout_minutes || 15;
    const aiWhitelist: string[] = hotelSettings?.whatsapp_ai_whitelist || [];
    const responseMode = hotelSettings?.whatsapp_response_mode || 'ai';
    const managerNumbers: Array<{phone: string; name: string; role?: string}> = hotelSettings?.whatsapp_manager_numbers || [];
    
    console.log(`Session timeout: ${sessionTimeoutMinutes}min, Response mode: ${responseMode}, Managers: ${managerNumbers.length}`);

    // Get existing session
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone_number', phone)
      .single();

    // Check if blocked
    if (session?.is_blocked) {
      console.log(`Blocked phone: ${phone}`);
      return new Response(JSON.stringify({ status: "blocked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle MANUAL mode - skip AI, log for admin
    if (responseMode === 'manual') {
      console.log(`📱 MANUAL MODE - skipping AI for ${phone}`);
      const convId = await ensureConversation(supabase, session, phone);
      await logMessage(supabase, convId, 'user', message);
      await updateSession(supabase, phone, convId, true);
      return new Response(JSON.stringify({ status: "manual_mode", conversation_id: convId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle AI whitelist - auto takeover
    if (aiWhitelist.includes(phone)) {
      console.log(`Phone ${phone} in AI whitelist - auto takeover`);
      const convId = await ensureConversation(supabase, session, phone);
      await logMessage(supabase, convId, 'user', message);
      await updateSession(supabase, phone, convId, true);
      return new Response(JSON.stringify({ status: "whitelist_takeover", conversation_id: convId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if phone is registered as manager - route to admin-chatbot
    const isManager = managerNumbers.some(m => m.phone === phone);
    if (isManager) {
      const managerInfo = managerNumbers.find(m => m.phone === phone);
      console.log(`📱 MANAGER MODE - routing to admin-chatbot for ${phone} (${managerInfo?.name})`);
      
      // Ensure conversation exists
      const convId = await ensureConversation(supabase, session, phone);
      await logMessage(supabase, convId, 'user', normalizedMessage);
      await updateSession(supabase, phone, convId, false, 'admin'); // Set session_type = 'admin'
      
      // Get conversation history - REDUCED for admin mode to prevent hallucination
      // Admin mode uses 5 messages max (vs 20 for guest) to minimize context pollution
      const adminHistoryLimit = 5;
      const { data: history } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(adminHistoryLimit);
      
      const messages = (history || []).reverse().map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      
      // Add current message if not in history
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.content !== normalizedMessage) {
        messages.push({ role: 'user' as const, content: normalizedMessage });
      }
      
      try {
        // Route to admin-chatbot with WhatsApp source and manager role
        const adminResponse = await fetch(`${supabaseUrl}/functions/v1/admin-chatbot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'X-WhatsApp-Source': 'true',
            'X-WhatsApp-Phone': phone,
            'X-Manager-Name': managerInfo?.name || 'Manager',
            'X-Manager-Role': managerInfo?.role || 'super_admin',
          },
          body: JSON.stringify({ messages }),
        });
        
        if (!adminResponse.ok) {
          const errorText = await adminResponse.text();
          console.error("Admin chatbot error:", errorText);
          throw new Error(`Admin chatbot error: ${adminResponse.status}`);
        }
        
        // admin-chatbot returns plain text stream, not SSE format
        const reader = adminResponse.body?.getReader();
        const decoder = new TextDecoder();
        let aiResponse = '';
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            // Direct text streaming (not SSE format)
            aiResponse += chunk;
          }
        }
        
        // Trim and check for actual content
        aiResponse = aiResponse.trim();
        console.log(`Admin chatbot raw response (first 300 chars): "${aiResponse.substring(0, 300)}"`);
        
        if (!aiResponse) {
          aiResponse = "Maaf, terjadi kesalahan. Silakan coba lagi.";
        }
        
        // Format for WhatsApp
        const formattedResponse = formatForWhatsApp(aiResponse);
        
        // Log assistant message
        await logMessage(supabase, convId, 'assistant', formattedResponse);
        
        // Send via Fonnte
        console.log(`Sending admin response to ${phone}: "${formattedResponse.substring(0, 100)}..."`);
        const sendResponse = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': FONNTE_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: phone,
            message: formattedResponse,
          }),
        });
        
        const sendResult = await sendResponse.json();
        console.log("Fonnte send result:", JSON.stringify(sendResult));
        
        return new Response(JSON.stringify({ 
          status: "manager_mode", 
          conversation_id: convId,
          manager_name: managerInfo?.name 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Manager mode error:", error);
        return new Response(JSON.stringify({ status: "error", error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle takeover mode - skip AI
    if (session?.is_takeover) {
      console.log(`Session ${phone} in takeover mode - logging only`);
      const convId = await ensureConversation(supabase, session, phone);
      await logMessage(supabase, convId, 'user', message);
      await supabase.from('whatsapp_sessions').update({ last_message_at: new Date().toISOString() }).eq('phone_number', phone);
      return new Response(JSON.stringify({ status: "takeover_mode", conversation_id: convId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get or create conversation
    const SESSION_TIMEOUT = sessionTimeoutMinutes * 60 * 1000;
    const lastMessageAt = session?.last_message_at ? new Date(session.last_message_at).getTime() : 0;
    const isStale = Date.now() - lastMessageAt > SESSION_TIMEOUT;
    
    let conversationId = session?.conversation_id;
    if (!conversationId || isStale) {
      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
        .select()
        .single();
      conversationId = newConv?.id;
      console.log(`Created new conversation: ${conversationId}`);
    }

    // Update session with session_type = 'guest' for regular users
    await supabase
      .from('whatsapp_sessions')
      .upsert({
        phone_number: phone,
        conversation_id: conversationId,
        last_message_at: new Date().toISOString(),
        is_active: true,
        session_type: 'guest',
      }, { onConflict: 'phone_number' });

    // Log user message (normalized)
    await logMessage(supabase, conversationId, 'user', normalizedMessage);

    // Get conversation history - get 20 NEWEST messages (descending), then reverse for chronological order
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Build messages array - reverse to get chronological order (oldest to newest)
    let messages = (history || []).reverse().map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    
    // If history is empty or last message doesn't match current, add it
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.content !== normalizedMessage) {
      messages.push({ role: 'user' as const, content: normalizedMessage });
    }
    
    console.log(`Messages array: ${messages.length} items, last user msg: "${messages.filter(m => m.role === 'user').pop()?.content || 'none'}"`);

    // === SIMPLE AI FLOW (like web chatbot) ===
    // Extract context from conversation history for booking continuation
    const conversationContext = extractConversationContext(messages);
    console.log("Calling chatbot function with context:", JSON.stringify(conversationContext));
    
    const chatbotResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        messages,
        session_id: `wa_${phone}`,
        channel: 'whatsapp',
        conversationContext, // Pass extracted context to chatbot
      }),
    });

    if (!chatbotResponse.ok) {
      const errorText = await chatbotResponse.text();
      console.error("Chatbot error:", errorText);
      throw new Error(`Chatbot error: ${chatbotResponse.status}`);
    }

    const chatbotData = await chatbotResponse.json();
    console.log("Chatbot response:", JSON.stringify(chatbotData).substring(0, 300));

    let aiMessage = chatbotData.choices?.[0]?.message;
    let aiResponse = aiMessage?.content || "";

    // Handle tool calls (like web chatbot)
    if (aiMessage?.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log(`Tool calls detected: ${aiMessage.tool_calls.length}`);
      
      const toolResults: any[] = [];
      for (const toolCall of aiMessage.tool_calls) {
        console.log(`Executing tool: ${toolCall.function.name}`);
        
        try {
          const toolResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot-tools`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tool_name: toolCall.function.name,
              parameters: JSON.parse(toolCall.function.arguments || '{}'),
            }),
          });

          const toolResult = await toolResponse.json();
          console.log(`Tool ${toolCall.function.name} result:`, JSON.stringify(toolResult).substring(0, 200));

          toolResults.push({
            role: 'tool',
            content: JSON.stringify(toolResult),
            tool_call_id: toolCall.id,
          });
        } catch (toolError) {
          console.error(`Tool ${toolCall.function.name} error:`, toolError);
          toolResults.push({
            role: 'tool',
            content: JSON.stringify({ error: "Tool execution failed" }),
            tool_call_id: toolCall.id,
          });
        }
      }

      // Get final response from AI with tool results
      console.log("Sending tool results back to chatbot...");
      const finalResponse = await fetch(`${supabaseUrl}/functions/v1/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'assistant', content: aiMessage.content, tool_calls: aiMessage.tool_calls },
            ...toolResults,
          ],
          session_id: `wa_${phone}`,
          channel: 'whatsapp',
          conversationContext, // Pass extracted context to chatbot
        }),
      });

      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        console.log("Final response:", JSON.stringify(finalData).substring(0, 300));
        aiResponse = finalData.choices?.[0]?.message?.content || aiResponse;
      } else {
        console.error("Final response error:", await finalResponse.text());
      }
    }

    // Smart fallback if empty - detect if it was a greeting
    if (!aiResponse || aiResponse.trim() === '') {
      console.log("⚠️ Empty AI response - checking for greeting fallback");
      const greetingPattern = /^(p|pagi|siang|sore|malam|halo|hai|hi|hello|hallo|selamat|tes|test)/i;
      if (greetingPattern.test(normalizedMessage)) {
        aiResponse = "Halo! 👋 Saya Rani dari Pomah Guesthouse. Ada yang bisa saya bantu?\n\nMau cek ketersediaan kamar atau ada pertanyaan lain? 🏨";
      } else {
        aiResponse = "Maaf, saya tidak bisa memproses permintaan Anda saat ini. Silakan coba lagi atau hubungi admin. 🙏";
      }
    }

    console.log(`AI Response for ${phone}: "${aiResponse.substring(0, 100)}..."`);

    // Log AI response
    await logMessage(supabase, conversationId, 'assistant', aiResponse);

    // Format for WhatsApp and send
    const formattedResponse = formatForWhatsApp(aiResponse);
    console.log(`📤 Sending WhatsApp to: ${phone}`);

    const fonnteSendResponse = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message: formattedResponse,
        countryCode: '62',
      }),
    });

    const fonnteResult = await fonnteSendResponse.json();
    console.log("Fonnte result:", JSON.stringify(fonnteResult));

    if (fonnteResult.status) {
      console.log("✅ WhatsApp sent successfully");
    } else {
      console.error("❌ Fonnte error:", fonnteResult);
    }

    return new Response(JSON.stringify({ 
      status: "success",
      conversation_id: conversationId,
      response_length: formattedResponse.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return new Response(JSON.stringify({ 
      status: "error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: Ensure conversation exists
async function ensureConversation(supabase: any, session: any, phone: string): Promise<string> {
  if (session?.conversation_id) return session.conversation_id;
  
  const { data: newConv } = await supabase
    .from('chat_conversations')
    .insert({ session_id: `wa_${phone}_${Date.now()}`, message_count: 0 })
    .select()
    .single();
  return newConv?.id;
}

// Helper: Log message to database
async function logMessage(supabase: any, conversationId: string, role: string, content: string) {
  if (!conversationId) return;
  
  await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    role,
    content,
  });
  
  // Update message count
  const { data: conv } = await supabase
    .from('chat_conversations')
    .select('message_count')
    .eq('id', conversationId)
    .single();
  
  await supabase
    .from('chat_conversations')
    .update({ message_count: (conv?.message_count || 0) + 1 })
    .eq('id', conversationId);
}

// Helper: Update session with session_type
async function updateSession(supabase: any, phone: string, conversationId: string, isTakeover: boolean, sessionType: 'guest' | 'admin' = 'guest') {
  await supabase
    .from('whatsapp_sessions')
    .upsert({
      phone_number: phone,
      conversation_id: conversationId,
      last_message_at: new Date().toISOString(),
      is_active: true,
      is_takeover: isTakeover,
      takeover_at: isTakeover ? new Date().toISOString() : null,
      session_type: sessionType,
    }, { onConflict: 'phone_number' });
}
