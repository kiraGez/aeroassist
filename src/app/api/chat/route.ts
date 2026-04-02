import { NextRequest, NextResponse } from 'next/server'
import { classifyIntent } from '@/lib/intent-router'
import { searchChunks, keywordSearch } from '@/lib/search'
import { generateResponse } from '@/lib/generation'
import { ChatMessage } from '@/lib/generation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, history = [] } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    console.log('Received query:', query)

    // Step 1: Classify intent
    let intent
    try {
      intent = await classifyIntent(query)
      console.log('Intent:', intent)
    } catch (intentError) {
      console.error('Intent classification failed:', intentError)
      // Default to technical query if classification fails
      intent = { type: 'technical_query' as const, keywords: query.split(' '), confidence: 0.5 }
    }

    // Step 2: Search database only if needed
    let context: any[] = []
    
    if (intent.type !== 'conversational') {
      try {
        context = await searchChunks(query)
        console.log('Found', context.length, 'chunks')
        
        if (context.length < 3 && intent.keywords && intent.keywords.length > 0) {
          const keywordResults = await keywordSearch(intent.keywords)
          context = [...context, ...keywordResults].slice(0, 8)
        }
      } catch (searchError) {
        console.error('Search failed:', searchError)
        // Continue without context
      }
    }

    // Step 3: Generate response
    try {
      const response = await generateResponse(
        query,
        intent.type,
        context,
        history as ChatMessage[]
      )

      return NextResponse.json({
        response,
        intent: intent.type,
        citations: context.map(c => ({
          page: c.pageNumber,
          document: c.documentTitle,
          preview: c.content.slice(0, 200) + '...'
        }))
      })
    } catch (genError) {
      console.error('Generation failed:', genError)
      return NextResponse.json({ 
        error: 'Failed to generate response: ' + (genError instanceof Error ? genError.message : 'Unknown error')
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
