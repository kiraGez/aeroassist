# AeroAssist - Production-Ready Flight Operations AI

An enterprise-grade, AI-powered flight operations assistant built with Next.js, Supabase, and OpenAI.

## Architecture

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: OpenAI (text-embedding-3-small + GPT-4o-mini)
- **Auth**: Supabase Auth

## Features

✅ **Intent Router** - Classifies prompts before search (conversational/technical/generative)
✅ **Vector Search** - Semantic similarity search with pgvector
✅ **Smart Context Window** - Fetches adjacent pages for complete context
✅ **Citations** - Every technical claim links to source
✅ **Admin Dashboard** - PDF upload and processing
✅ **Zero Hallucination** - AI only uses provided context

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
- `OPENAI_API_KEY` - from OpenAI dashboard

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

```bash
vercel deploy
```

## API Endpoints

- `POST /api/chat` - Main chat endpoint
- `POST /api/documents` - Upload PDF (admin only)
- `GET /api/documents` - List documents
- `DELETE /api/documents?id=...` - Delete document (admin only)

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI | Next.js + Tailwind | Chat interface, admin dashboard |
| Auth | Supabase Auth | Role-based access (admin/pilot) |
| Vector DB | pgvector | Semantic search on PDF chunks |
| Embeddings | text-embedding-3-small | Convert text to vectors |
| Generation | GPT-4o-mini | Response generation with citations |

## License

MIT
