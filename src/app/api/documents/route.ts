import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbeddings } from '@/lib/ai'

// Dynamic import for CommonJS module
const pdfParse = require('pdf-parse')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = (formData.get('title') as string) || file?.name?.replace('.pdf', '')
    const userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse PDF
    const parse = (pdfParse as any).default || pdfParse
    const pdfData = await parse(buffer)
    const totalPages = pdfData.numpages

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        filename: file.name,
        total_pages: totalPages,
        uploaded_by: userId || null
      })
      .select()
      .single()

    if (docError) throw docError

    // Process pages - split into chunks
    const chunkSize = 1000
    const overlap = 200
    const chunks: Array<{
      document_id: string
      page_number: number
      chunk_index: number
      content: string
    }> = []

    let chunkIndex = 0
    let pageNumber = 1
    
    const pageLength = Math.ceil(pdfData.text.length / totalPages)

    for (let i = 0; i < pdfData.text.length; i += (chunkSize - overlap)) {
      const content = pdfData.text.slice(i, i + chunkSize).trim()
      
      if (content.length > 50) {
        pageNumber = Math.min(Math.floor(i / pageLength) + 1, totalPages)
        
        chunks.push({
          document_id: document.id,
          page_number: pageNumber,
          chunk_index: chunkIndex,
          content
        })
        chunkIndex++
      }
    }

    // Generate embeddings in batches
    const batchSize = 10
    let processed = 0

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const texts = batch.map(c => c.content)
      
      const embeddings = await generateEmbeddings(texts)
      
      const chunksWithEmbeddings = batch.map((c, idx) => ({
        ...c,
        embedding: embeddings[idx]
      }))

      const { error: insertError } = await supabaseAdmin
        .from('chunks')
        .insert(chunksWithEmbeddings)

      if (insertError) {
        console.error('Insert error:', insertError)
      }

      processed += batch.length
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title,
        totalPages,
        chunksProcessed: processed
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process document: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}

// Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

// List documents
export async function GET() {
  try {
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, filename, total_pages, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}
