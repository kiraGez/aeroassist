import openai, { CHAT_MODEL } from './openai'

export type IntentType = 'conversational' | 'technical_query' | 'generative_task'

export interface IntentClassification {
  type: IntentType
  keywords?: string[]
  topic?: string
  confidence: number
}

// Intent Router: Classifies user prompts before database search
export async function classifyIntent(query: string): Promise<IntentClassification> {
  const systemPrompt = `You are an intent classifier for AeroAssist, a flight operations AI assistant.

Classify the user's message into exactly ONE of these categories:

1. "conversational" - Greetings, small talk, or general questions that don't require technical data.
   Examples: "Hello", "How are you?", "What can you do?", "Hi there"

2. "technical_query" - Questions asking for specific aviation data, procedures, limitations, or facts.
   Examples: "What is the max crosswind?", "Engine fire procedure", "Turbulence penetration speed B777"

3. "generative_task" - Requests to create quizzes, scenarios, explanations, or training materials.
   Examples: "Give me a quiz on hydraulics", "Create a scenario for engine failure", "Explain the fuel system"

IMPORTANT: 
- For technical_query: Extract 3-5 specific keywords for database search
- For generative_task: Extract the topic/subject
- Respond with JSON only: {"type": "...", "keywords": [...], "topic": "...", "confidence": 0.0-1.0}`

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    return {
      type: result.type as IntentType || 'conversational',
      keywords: result.keywords || [],
      topic: result.topic,
      confidence: result.confidence || 0.8
    }
  } catch (error) {
    console.error('Intent classification error:', error)
    // Default to conversational on error
    return {
      type: 'conversational',
      confidence: 0.5
    }
  }
}
