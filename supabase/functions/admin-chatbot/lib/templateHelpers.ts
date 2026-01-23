// ============= TEMPLATE HELPERS =============

interface TemplateData {
  command_key: string;
  template_content: string;
  is_active: boolean;
}

// Cache templates in memory
let templateCache: Record<string, string> = {};
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getTemplate(supabase: any, commandKey: string): Promise<string | null> {
  // Check cache
  const now = Date.now();
  if (templateCache[commandKey] && (now - lastFetch) < CACHE_TTL) {
    return templateCache[commandKey];
  }

  // Fetch from database
  const { data, error } = await supabase
    .from('admin_chatbot_templates')
    .select('command_key, template_content, is_active')
    .eq('command_key', commandKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.log(`Template not found for: ${commandKey}`);
    return null;
  }

  // Update cache
  templateCache[commandKey] = data.template_content;
  lastFetch = now;

  return data.template_content;
}

export async function getAllActiveTemplates(supabase: any): Promise<Record<string, string>> {
  const now = Date.now();
  if (Object.keys(templateCache).length > 0 && (now - lastFetch) < CACHE_TTL) {
    return templateCache;
  }

  const { data, error } = await supabase
    .from('admin_chatbot_templates')
    .select('command_key, template_content')
    .eq('is_active', true);

  if (error || !data) {
    console.log('Failed to fetch templates:', error);
    return templateCache;
  }

  templateCache = {};
  for (const t of data) {
    templateCache[t.command_key] = t.template_content;
  }
  lastFetch = now;

  return templateCache;
}

export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  
  return result;
}

export function clearTemplateCache() {
  templateCache = {};
  lastFetch = 0;
}
