# AeroAssist - Production-Ready Flight Operations AI

An enterprise-grade, AI-powered flight operations assistant built with Next.js, Supabase, and Gemini.

## Architecture

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Google Gemini 1.5 Flash + text-embedding-004
- **Auth**: Supabase Auth

## Features

### ✅ Core Features
- **Intent Router** - Classifies prompts before search (conversational/technical/generative)
- **Hybrid Search** - Combines vector similarity + BM25 full-text search for better recall
- **Smart Context Window** - Fetches adjacent pages for complete context
- **Streaming Responses** - Real-time token streaming for faster perceived response
- **Citations** - Every technical claim links to source
- **Admin Dashboard** - PDF upload and processing
- **Zero Hallucination** - AI only uses provided context

### ✅ New in v0.2
- **Conversation Persistence** - Chat history saved per user
- **Rate Limiting** - Protects against API abuse (20 req/min for chat)
- **Admin-Only Write Access** - RLS policies restrict document management
- **Test Suite** - Vitest tests for core functionality

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL schema in `supabase/schema.sql`

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` - from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` - from Supabase dashboard (Settings > API)
- `GEMINI_API_KEY` - from Google AI Studio

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Run Tests

```bash
npm test
# or watch mode
npm run test:watch
```

### 5. Deploy to Vercel

```bash
vercel deploy
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main chat endpoint (with rate limiting) |
| `/api/chat/stream` | POST | Streaming chat (SSE) |
| `/api/documents` | GET, POST, DELETE | Document management (admin only) |
| `/api/conversations` | GET, POST, DELETE | Conversation management |
| `/api/messages` | GET, POST | Message persistence |
| `/api/health` | GET | Health check |

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI | Next.js + Tailwind | Chat interface, admin dashboard |
| Auth | Supabase Auth | Role-based access (admin/pilot) |
| Vector DB | pgvector | Semantic search on PDF chunks |
| Full-Text | PostgreSQL tsvector | BM25 keyword matching |
| Embeddings | text-embedding-004 | Convert text to vectors |
| Generation | Gemini 1.5 Flash | Response generation with citations |

## Database Schema

```sql
-- Core tables
documents (id, title, filename, total_pages, uploaded_by, created_at)
chunks (id, document_id, page_number, chunk_index, content, embedding, content_tsv)

-- Conversation persistence
conversations (id, user_id, title, created_at, updated_at)
messages (id, conversation_id, role, content, citations, created_at)

-- Functions
match_chunks() - Vector similarity search
hybrid_search() - Combined vector + BM25 search
```

## Security

- **RLS Policies**: Users can only access their own conversations
- **Admin-Only Write**: Only admins can upload/delete documents
- **Rate Limiting**: 20 chat requests/minute, 10 uploads/hour
- **No Hallucination**: AI only responds using provided context

## License

MIT
