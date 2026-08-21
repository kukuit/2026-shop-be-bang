import { SYSTEM_PROMPTS, type ChatContext } from './constants'

export type ClientMessage = { role: 'user' | 'assistant'; content: string }
type LlmMessage = ClientMessage | { role: 'system'; content: string }
type ChatProvider = 'groq' | 'openai' | 'anthropic'

const CHAT_PROVIDER = (process.env.CHAT_PROVIDER ?? 'groq').toLowerCase() as ChatProvider

function getModelConfig() {
  switch (CHAT_PROVIDER) {
    case 'openai':
      return { provider: 'openai' as const, baseUrl: 'https://api.openai.com/v1', model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY }
    case 'anthropic':
      return { provider: 'anthropic' as const, baseUrl: 'https://api.anthropic.com/v1', model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest', apiKey: process.env.ANTHROPIC_API_KEY }
    case 'groq':
    default:
      return { provider: 'groq' as const, baseUrl: 'https://api.groq.com/openai/v1', model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b', apiKey: process.env.GROQ_API_KEY }
  }
}

export async function callChatModel(clientMessages: ClientMessage[], context: ChatContext): Promise<string> {
  const { provider, baseUrl, model, apiKey } = getModelConfig()
  const systemPrompt = SYSTEM_PROMPTS[context]

  if (!apiKey) throw new Error(`Chưa cấu hình API key cho nhà cung cấp chatbot ${provider}.`)

  const request: { url: string; headers: Record<string, string>; body: object } = provider === 'anthropic'
    ? {
        url: `${baseUrl}/messages`,
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: { model, system: systemPrompt, messages: clientMessages, temperature: 0.6, max_tokens: 350 },
      }
    : {
        url: `${baseUrl}/chat/completions`,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: { model, messages: [{ role: 'system', content: systemPrompt }, ...clientMessages] as LlmMessage[], temperature: 0.6, max_tokens: 350 },
      }

  const res = await fetch(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) })
  if (!res.ok) {
    const responseText = await res.text()
    console.error('LLM request failed:', provider, model, res.status, responseText)
    if (res.status === 401 || res.status === 403) throw new Error(`API key ${provider} không hợp lệ hoặc không có quyền truy cập.`)
    if (res.status === 404) throw new Error(`Model chatbot “${model}” không tồn tại hoặc tài khoản chưa được cấp quyền.`)
    if (res.status === 429) throw new Error('Chatbot đã đạt giới hạn miễn phí. Bạn vui lòng thử lại sau một chút.')
    throw new Error(`Không thể kết nối chatbot (${provider}, mã lỗi ${res.status}).`)
  }

  const data = await res.json()
  const reply = provider === 'anthropic'
    ? data.content?.find((item: { type?: string }) => item.type === 'text')?.text
    : data.choices?.[0]?.message?.content
  return reply ?? 'Mình chưa thể trả lời câu hỏi này. Bạn thử lại giúp mình nhé.'
}
