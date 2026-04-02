import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { classifyIntent } from '@/lib/intent-router'
import { searchChunks, keywordSearch } from '@/lib/search'
import { generateResponse } from '@/lib/generation'
import { ChatMessage } from '@/lib/generation'

export async function POST(request: NextRequest) {
  try {
    const { query, history = [] } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Step 1: Classify intent
    const intent = await classifyIntent(query)

    // Step 2: Search database only if needed
    let context: any[] = []
    
    if (intent.type !== 'conversational') {
      // Use keywords from intent classification for better search
      if (intent.keywords && intent.keywords.length > 0) {
        // Combine vector search with keyword matching
        context = await searchChunks(query)
        
        // If vector search returns few results, augment with keyword search
        if (context.length < 3 && intent.keywords.length > 0) {
          const keywordResults = await keywordSearch(intent.keywords)
          context = [...context, ...keywordResults].slice(0, 8)
        }
      } else {
        context = await searchChunks(query)
      }
    }

    // Step 3: Generate response
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
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
