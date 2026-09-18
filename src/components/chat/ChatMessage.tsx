import { Bot } from 'lucide-react'

/** Shared message presentation for Aqua and the personal task assistant. */
export default function ChatMessage({ role, content, assistantName }: { role: 'user' | 'assistant'; content: string; assistantName: string }) {
  return <article className={`demo-message ${role}`}>
    <small>{role === 'user' ? 'Bạn' : <><Bot size={13} /> {assistantName} · Trợ lý</>}</small>
    <p>{content}</p>
  </article>
}
