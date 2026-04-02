import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import pdf from 'pdf-parse'
import { supabaseAdmin } from '@/lib/supabase'
import { generateEmbeddings } from '@/lib/openai'

// Admin emails - customize this list
const ADMIN_EMAILS = ['admin', 'wise_hat_2017', 'cool_ball_2253']

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userEmail = session.user?.email || ''
    const isAdmin = ADMIN_EMAILS.some(email => 
      userEmail.includes(email) || session.user?.user_metadata?.role === 'admin'
    )

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file?.name?.replace('.pdf', '')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse PDF
    const pdfData = await pdf(buffer)
    const totalPages = pdfData.numpages

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        title,
        filename: file.name,
        total_pages: totalPages,
        uploaded_by: session.user.id
      })
      .select()
      .single()

    if (docError) throw docError

    // Process pages
    const chunks: Array<{
      document_id: string
      page_number: number
      chunk_index: number
      content: string
    }> = []

    // pdf-parse returns text per page
    // We need to split by pages since pdf-parse gives us full text
    // For better results, use a library that gives page-by-page extraction
    
    // For now, we'll chunk the full text into reasonable sizes
    const chunkSize = 1000 // characters per chunk
    const overlap = 200 // character overlap for context continuity
    
    let chunkIndex = 0
    let pageNumber = 1
    
    for (let i = 0; i < pdfData.text.length; i += (chunkSize - overlap)) {
      const content = pdfData.text.slice(i, i + chunkSize).trim()
      
      if (content.length > 50) {
        chunks.push({
          document_id: document.id,
          page_number: pageNumber,
          chunk_index: chunkIndex,
          content
        })
        chunkIndex++
      }
      
      // Rough page estimation (every ~3000 chars is ~1 page)
      if (i > pageNumber * 3000) {
        pageNumber++
      }
    }

    // Generate embeddings in batches
    const batchSize = 20
    const insertedChunks = []

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

      insertedChunks.push(...chunksWithEmbeddings)
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title,
        totalPages,
        chunksProcessed: insertedChunks.length
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process document' },
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

    // Check auth
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete document (cascades to chunks)
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
