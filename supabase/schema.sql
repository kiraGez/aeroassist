-- AeroAssist Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (metadata for uploaded PDFs)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  total_pages INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chunks table (text chunks with embeddings)
CREATE TABLE IF NOT EXISTS chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768), -- Gemini text-embedding-004 dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add full-text search column and index for hybrid search
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS chunks_content_tsv_idx ON chunks USING GIN (content_tsv);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can read
CREATE POLICY "Anyone can read documents" ON documents FOR SELECT USING (true);
CREATE POLICY "Anyone can read chunks" ON chunks FOR SELECT USING (true);

-- Admin-only write access (checks user_metadata.role = 'admin')
CREATE POLICY "Admins can insert documents" ON documents FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can insert chunks" ON chunks FOR INSERT
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can delete documents" ON documents FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admins can delete chunks" ON chunks FOR DELETE
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Service role bypasses RLS (for server-side PDF processing)
-- Note: Ensure SUPABASE_SERVICE_ROLE_KEY is used for document/chunk operations

-- Conversations table (chat history persistence)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (individual chat messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversation queries
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations" ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own messages" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own messages" ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()
  ));

-- Function to find similar chunks (vector search)
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INTEGER DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  page_number INTEGER,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.page_number,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Hybrid search function: combines vector similarity + full-text search
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding VECTOR(768),
  search_query TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INTEGER DEFAULT 8,
  vector_weight FLOAT DEFAULT 0.7,
  bm25_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  page_number INTEGER,
  chunk_index INTEGER,
  content TEXT,
  similarity FLOAT,
  bm25_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.page_number,
    c.chunk_index,
    c.content,
    (1 - (c.embedding <=> query_embedding)) AS similarity,
    ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', search_query)) AS bm25_score,
    (
      vector_weight * (1 - (c.embedding <=> query_embedding)) +
      bm25_weight * ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', search_query))
    ) AS combined_score
  FROM chunks c
  WHERE
    (1 - (c.embedding <=> query_embedding)) > match_threshold
    OR c.content_tsv @@ websearch_to_tsquery('english', search_query)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
