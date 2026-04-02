import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Models
const EMBEDDING_MODEL = 'text-embedding-004'
const CHAT_MODEL = 'gemini-2.0-flash'

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  const result = await model.embedContent(text.replace(/\n/g, ' ').slice(0, 8000))
  return result.embedding.values
}

// Generate embeddings for multiple texts in batch
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  for (const text of texts) {
    const embedding = await generateEmbedding(text)
    embeddings.push(embedding)
  }
  return embeddings
}

// Chat completion
export async function chatCompletion(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.3 } = options

  const model = genAI.getGenerativeModel({ 
    model: CHAT_MODEL,
    systemInstruction: systemPrompt
  })

  const history = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const chat = model.startChat({ history })
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  
  if (!lastUserMessage) {
    throw new Error('No user message found')
  }

  const result = await chat.sendMessage(lastUserMessage.content)
  return result.response.text()
}

// Stream chat completion
export async function* streamChatCompletion(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): AsyncGenerator<string> {
  const model = genAI.getGenerativeModel({ 
    model: CHAT_MODEL,
    systemInstruction: systemPrompt
  })

  const history = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const chat = model.startChat({ history })
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  
  if (!lastUserMessage) {
    throw new Error('No user message found')
  }

  const result = await chat.sendMessageStream(lastUserMessage.content)
  
  for await (const chunk of result.stream) {
    const text = chunk.text()
    if (text) yield text
  }
}

export const CHAT_MODEL_NAME = CHAT_MODEL
