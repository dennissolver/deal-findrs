import OpenAI from 'openai';

// Model name is the DataWizz endpoint name
export const AI_MODEL = process.env.DATAWIZZ_MODEL || 'dealfindrs';

// Lazy initialization to avoid build-time errors
let _aiClient: OpenAI | null = null;

function getAIClient(): OpenAI {
  if (!_aiClient) {
    const apiKey = process.env.DATAWIZZ_API_KEY;
    const baseURL = process.env.DATAWIZZ_BASE_URL;
    
    if (!apiKey || !baseURL) {
      throw new Error('DataWizz API key and base URL are required. Set DATAWIZZ_API_KEY and DATAWIZZ_BASE_URL environment variables.');
    }
    
    _aiClient = new OpenAI({
      apiKey,
      baseURL,
    });
  }
  return _aiClient;
}

// Export getter for client
export const aiClient = {
  get instance() {
    return getAIClient();
  }
};

// Helper function for chat completions
export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    metadata?: Record<string, string>;
  }
) {
  const client = getAIClient();
  
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,
    // DataWizz supports metadata for logging/routing
    ...(options?.metadata && { metadata: options.metadata }),
  });

  return response.choices[0]?.message?.content || '';
}
