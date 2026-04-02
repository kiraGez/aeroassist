import { supabase } from './supabase'
import { generateEmbedding } from './ai'

export interface SearchResult {
  id: string
  documentId: string
  documentTitle: string
  pageNumber: number
  content: string
  similarity: number
}

// Vector similarity search using pgvector
export async function searchChunks(
  query: string, 
  options: {
    matchThreshold?: number
    matchCount?: number
    includeAdjacent?: boolean
  } = {}
): Promise<SearchResult[]> {
  const { matchThreshold = 0.5, matchCount = 8, includeAdjacent = true } = options

  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query)

    // Call the match_chunks function
    const { data: matches, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) {
      console.error('Search error:', error)
      return []
    }
    if (!matches || matches.length === 0) return []

    // Enrich with document titles
    const documentIds = [...new Set(matches.map((m: any) => m.document_id))]
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title')
      .in('id', documentIds)

    const docMap = new Map(documents?.map(d => [d.id, d.title]) || [])

    let results: SearchResult[] = matches.map((m: any) => ({
      id: m.id,
      documentId: m.document_id,
      documentTitle: docMap.get(m.document_id) || 'Unknown',
      pageNumber: m.page_number,
      content: m.content,
      similarity: m.similarity
    }))

    // Smart Context Window: Fetch adjacent pages if enabled
    if (includeAdjacent && results.length > 0) {
      results = await enrichWithAdjacentPages(results)
    }

    return results
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

// Fetch adjacent pages to ensure complete context for split tables/checklists
async function enrichWithAdjacentPages(results: SearchResult[]): Promise<SearchResult[]> {
  const enriched: SearchResult[] = []
  
  for (const result of results) {
    enriched.push(result)
    
    const adjacentPages = [result.pageNumber - 1, result.pageNumber + 1]
    
    for (const pageNum of adjacentPages) {
      if (enriched.some(r => r.documentId === result.documentId && r.pageNumber === pageNum)) continue
      
      const { data: adjacent } = await supabase
        .from('chunks')
        .select('id, content')
        .eq('document_id', result.documentId)
        .eq('page_number', pageNum)
        .limit(1)
      
      if (adjacent && adjacent.length > 0) {
        enriched.push({
          id: adjacent[0].id,
          documentId: result.documentId,
          documentTitle: result.documentTitle,
          pageNumber: pageNum,
          content: adjacent[0].content,
          similarity: result.similarity * 0.9
        })
      }
    }
  }
  
  return enriched.sort((a, b) => a.pageNumber - b.pageNumber)
}

// Keyword-based fallback search
export async function keywordSearch(
  keywords: string[],
  options: { limit?: number } = {}
): Promise<SearchResult[]> {
  const { limit = 8 } = options
  
  const query = supabase
    .from('chunks')
    .select('id, document_id, page_number, content')
    .or(keywords.map(k => `content.ilike.%${k}%`).join(','))
    .limit(limit)
  
  const { data: chunks, error } = await query
  
  if (error || !chunks) return []
  
  const documentIds = [...new Set(chunks.map(c => c.document_id))]
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title')
    .in('id', documentIds)
  
  const docMap = new Map(documents?.map(d => [d.id, d.title]) || [])
  
  return chunks.map(c => ({
    id: c.id,
    documentId: c.document_id,
    documentTitle: docMap.get(c.document_id) || 'Unknown',
    pageNumber: c.page_number,
    content: c.content,
    similarity: 0.7
  }))
}
