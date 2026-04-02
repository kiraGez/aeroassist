# AeroAssist Deployment Guide

## Step 1: Setup Supabase Database

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/dupcirsfkaskopbfqhzu
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `supabase/schema.sql` 
5. Click **Run** to execute

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import your GitHub repo: `kiraGez/aeroassist`
3. Vercel will auto-detect Next.js
4. Add these Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://dupcirsfkaskopbfqhzu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cGNpcnNma2Fza29wYmZxaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDEzMTMsImV4cCI6MjA5MDMxNzMxM30.sW9r1b8KEy-tivHM9Nt-0k9J54JrAlAxfEuC-1wZTgE
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cGNpcnNma2Fza29wYmZxaHp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc0MTMxMywiZXhwIjoyMDkwMzE3MzEzfQ.V-fJhMoZYeslABGoP5pkNLgmVarNblE08JLMfqChVvY
   GEMINI_API_KEY=AIzaSyC86I_v-LxVRGZD_h4HeMHyQmmRNv0oZI8
   ```
5. Click **Deploy**

### Option B: Via CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Step 3: Test the App

1. Open your deployed URL
2. Click **Admin Dashboard**
3. Upload a PDF manual (e.g., B777 FCOM)
4. Wait for processing
5. Ask questions in the chat!

## Architecture

```
User Query → Intent Router → Vector Search → Gemini AI → Response
                  ↓
          Classifies as:
          - Conversational (no DB search)
          - Technical Query (search + cite)
          - Generative Task (quiz/scenario)
```

## Features

✅ **Intent Router** - Classifies prompts before search
✅ **Vector Search** - Semantic similarity with pgvector  
✅ **Smart Context** - Fetches adjacent pages
✅ **Citations** - Clickable [Page X] links
✅ **Gemini AI** - Fast, accurate responses

## Tech Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Gemini (text-embedding-004 + gemini-2.0-flash)

## Repository

https://github.com/kiraGez/aeroassist
