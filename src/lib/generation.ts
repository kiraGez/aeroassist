import openai, { CHAT_MODEL } from './openai'
import { SearchResult } from './search'
import { IntentType } from './intent-router'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface GenerationOptions {
  maxTokens?: number
  temperature?: number
}

// Build system prompt based on intent and context
function buildSystemPrompt(
  intent: IntentType, 
  context: SearchResult[],
  topic?: string
): string {
  const basePrompt = `You are AeroAssist, an elite flight instructor AI for aviation professionals.

SAFETY DIRECTIVES:
1. Answer ONLY using the provided knowledge base excerpts.
2. If information is missing, state: "I don't have that information in the currently approved manuals."
3. Never invent, guess, or use outside aviation knowledge.
4. Append citations as [Page X] at the end of relevant sentences.

CONTEXT FROM APPROVED MANUALS:
${context.length > 0 
  ? context.map(c => `[${c.documentTitle} - Page ${c.pageNumber}]\n${c.content}`).join('\n\n---\n\n')
  : "(No relevant context found. State you don't have the information.)"
}

IMPORTANT NOTES:
- PDF tables may be extracted poorly; look closely for numbers adjacent to keywords.
- If a procedure seems incomplete, mention that the manual may have split content.`

  // Add intent-specific instructions
  if (intent === 'generative_task') {
    return `${basePrompt}

GENERATIVE TASK INSTRUCTIONS:
The user has requested educational content (quiz, scenario, explanation).
- Generate content STRICTLY based on the provided context only
- Structure quizzes clearly with numbered questions
- Provide answer keys at the end
- Focus on: ${topic || 'relevant aviation topics from context'}
- Use clear, instructional language`
  }

  if (intent === 'technical_query') {
    return `${basePrompt}

TECHNICAL QUERY INSTRUCTIONS:
- Provide precise, factual answers
- Use bullet points for procedures
- Include all relevant numbers and limitations
- Cite the page number for each fact`
  }

  // Conversational
  return `${basePrompt}

CONVERSATIONAL INSTRUCTIONS:
- Be friendly and professional
- Introduce yourself as AeroAssist
- Briefly explain your capabilities
- Offer to help with technical queries or quizzes`
}

// Generate response using RAG
export async function generateResponse(
  query: string,
  intent: IntentType,
  context: SearchResult[],
  history: ChatMessage[],
  options: GenerationOptions = {}
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.3 } = options

  const systemPrompt = buildSystemPrompt(intent, context)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: query }
  ]

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature
    })

    return response.choices[0].message.content || 'No response generated.'
  } catch (error) {
    console.error('Generation error:', error)
    throw new Error('Failed to generate response. Please try again.')
  }
}

// Stream response for real-time display
export async function* streamResponse(
  query: string,
  intent: IntentType,
  context: SearchResult[],
  history: ChatMessage[],
  options: GenerationOptions = {}
): AsyncGenerator<string> {
  const { maxTokens = 2000, temperature = 0.3 } = options

  const systemPrompt = buildSystemPrompt(intent, context)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user', content: query }
  ]

  try {
    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) yield content
    }
  } catch (error) {
    console.error('Stream error:', error)
    throw new Error('Failed to stream response.')
  }
}
