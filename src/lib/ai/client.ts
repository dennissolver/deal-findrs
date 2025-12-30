import OpenAI from 'openai';

// DataWizz client - routes through DataWizz gateway to Anthropic Claude
export const aiClient = new OpenAI({
  apiKey: process.env.DATAWIZZ_API_KEY!,
  baseURL: process.env.DATAWIZZ_BASE_URL!,
});

// Model name is the DataWizz endpoint name
export const AI_MODEL = process.env.DATAWIZZ_MODEL || 'dealfindrs';

// Helper function for chat completions
export async function chat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    metadata?: Record<string, string>;
  }
) {
  const response = await aiClient.chat.completions.create({
    model: AI_MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 4096,
    // DataWizz supports metadata for logging/routing
    ...(options?.metadata && { metadata: options.metadata }),
  });

  return response.choices[0]?.message?.content || '';
}
