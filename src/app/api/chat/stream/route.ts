import { NextRequest } from 'next/server'
import { classifyIntent } from '@/lib/intent-router'
import { searchChunks, keywordSearch } from '@/lib/search'
import { streamChatCompletion } from '@/lib/ai'
import { buildSystemPrompt } from '@/lib/generation'
import { chatRateLimit } from '@/lib/rate-limit'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResult = await chatRateLimit(request)
  if (rateLimitResult instanceof Response) {
    return rateLimitResult
  }

  try {
    const body = await request.json()
    const { query, history = [] } = body

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Step 1: Classify intent
    let intent
    try {
      intent = await classifyIntent(query)
    } catch {
      intent = {
        type: 'technical_query' as const,
        keywords: query.split(' '),
        confidence: 0.5
      }
    }

    // Step 2: Search database if needed
    let context: any[] = []
    if (intent.type !== 'conversational') {
      try {
        context = await searchChunks(query)
        if (context.length < 3 && intent.keywords?.length) {
          const keywordResults = await keywordSearch(intent.keywords)
          context = [...context, ...keywordResults].slice(0, 8)
        }
      } catch {
        // Continue without context
      }
    }

    // Step 3: Build system prompt
    const systemPrompt = buildSystemPrompt(intent.type, context, intent.topic)

    // Step 4: Stream response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          const metadata = {
            type: 'metadata',
            intent: intent.type,
            citations: context.map(c => ({
              page: c.pageNumber,
              document: c.documentTitle
            }))
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))

          // Stream the response
          const messages = history
            .filter((m: any) => m.role !== 'system')
            .slice(-6)
            .map((m: any) => ({ role: m.role, content: m.content }))

          for await (const chunk of streamChatCompletion(systemPrompt, messages)) {
            const data = { type: 'token', content: chunk }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          }

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error) {
          const errorData = { type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
