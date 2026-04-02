import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export default openai

// Embedding model for vector search
export const EMBEDDING_MODEL = 'text-embedding-3-small'

// Chat model for generation
export const CHAT_MODEL = 'gpt-4o-mini'

// Generate embeddings for text chunks
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, ' ').slice(0, 8000), // Truncate to token limit
  })
  return response.data[0].embedding
}

// Generate embeddings for multiple texts in batch
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map(t => t.replace(/\n/g, ' ').slice(0, 8000)),
  })
  return response.data.map(d => d.embedding)
}
