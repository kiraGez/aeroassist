import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function extractText(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument(data).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    fullText += text + '\n';
    if (i % 100 === 0) console.log(`Extracted page ${i}/${numPages}`);
  }

  return { numPages, text: fullText };
}

async function generateEmbeddings(texts) {
  const results = [];
  
  for (const text of texts) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text: text.substring(0, 2000) }] }
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    results.push(data.embedding?.values || []);
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }

  return results;
}

async function main() {
  const pdfPath = process.argv[2] || '/teamspace/studios/this_studio/.openclaw/media/inbound/B777_FCOM---ac3f8111-9deb-457d-b769-55b81cbf5456.pdf';
  const title = process.argv[3] || 'B777_FCOM';

  console.log('Reading PDF:', pdfPath);
  const { numPages, text } = await extractText(pdfPath);
  console.log(`PDF: ${numPages} pages, ${text.length} characters`);

  // Create document record
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({ title, filename: 'B777_FCOM.pdf', total_pages: numPages, uploaded_by: 'script' })
    .select()
    .single();

  if (docError) {
    console.error('Document insert error:', docError);
    process.exit(1);
  }

  console.log('Created document:', document.id);

  // Split into chunks
  const chunkSize = 1000;
  const overlap = 200;
  const pageLength = Math.ceil(text.length / numPages);
  const chunks = [];
  let chunkIndex = 0;

  for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
    const content = text.slice(i, i + chunkSize).trim();
    if (content.length > 50) {
      const pageNumber = Math.min(Math.floor(i / pageLength) + 1, numPages);
      chunks.push({
        document_id: document.id,
        page_number: pageNumber,
        chunk_index: chunkIndex,
        content
      });
      chunkIndex++;
    }
  }

  console.log(`Created ${chunks.length} chunks`);

  // Process in batches
  const batchSize = 5;
  let processed = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);

    try {
      const texts = batch.map(c => c.content);
      const embeddings = await generateEmbeddings(texts);

      const chunksWithEmbeddings = batch.map((c, idx) => ({
        ...c,
        embedding: embeddings[idx]
      }));

      const { error: insertError } = await supabase
        .from('chunks')
        .insert(chunksWithEmbeddings);

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        processed += batch.length;
        console.log(`Processed ${processed}/${chunks.length} chunks`);
      }
    } catch (e) {
      console.error('Batch error:', e);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n✅ Complete! Processed ${processed}/${chunks.length} chunks`);
}

main().catch(console.error);
