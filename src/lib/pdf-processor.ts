import { generateEmbeddings } from './ai'
import { supabaseAdmin } from './supabase'

// Admin emails - customize this list
export const ADMIN_EMAILS = ['admin', 'wise_hat_2017', 'cool_ball_2253', 'kiraGez']

// Process PDF and store chunks with embeddings
export async function processPdf(
  documentId: string,
  pages: Array<{ pageNumber: number; content: string }>
): Promise<{ success: boolean; chunksProcessed: number; error?: string }> {
  try {
    const chunks: Array<{
      document_id: string
      page_number: number
      chunk_index: number
      content: string
    }> = []

    // Split content into chunks (~1000 chars with overlap)
    const chunkSize = 1000
    const overlap = 200

    for (const page of pages) {
      let chunkIndex = 0
      for (let i = 0; i < page.content.length; i += (chunkSize - overlap)) {
        const content = page.content.slice(i, i + chunkSize).trim()
        if (content.length > 50) {
          chunks.push({
            document_id: documentId,
            page_number: page.pageNumber,
            chunk_index: chunkIndex,
            content
          })
          chunkIndex++
        }
      }
    }

    // Generate embeddings in batches
    const batchSize = 10
    let processed = 0

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map(c => c.content)
      
      // Generate embeddings
      const embeddings = await generateEmbeddings(texts)
      
      // Insert into database
      const chunksWithEmbeddings = batch.map((c, idx) => ({
        ...c,
        embedding: embeddings[idx]
      }))

      const { error: insertError } = await supabaseAdmin
        .from('chunks')
        .insert(chunksWithEmbeddings)

      if (insertError) {
        console.error('Insert error:', insertError)
        // Continue with other batches
      }

      processed += batch.length
    }

    return { success: true, chunksProcessed: processed }
  } catch (error) {
    console.error('Process PDF error:', error)
    return { 
      success: false, 
      chunksProcessed: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
