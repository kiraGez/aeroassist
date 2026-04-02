'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Trash2, Check, X } from 'lucide-react'

interface Document {
  id: string
  title: string
  filename: string
  total_pages: number
  created_at: string
}

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export function AdminDashboard({ isOpen, onClose, userId }: AdminDashboardProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file')
        return
      }
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB')
        return
      }
      setSelectedFile(file)
      setDocTitle(file.name.replace('.pdf', ''))
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress('Uploading PDF...')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', docTitle)
      formData.append('userId', userId)

      setUploadProgress('Processing and creating embeddings...')

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadProgress(`✓ Processed ${data.document.chunksProcessed} chunks from ${data.document.totalPages} pages`)
      await fetchDocuments()
      setSelectedFile(null)
      setDocTitle('')
      
      // Auto-close success message after 3 seconds
      setTimeout(() => setUploadProgress(''), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setUploadProgress('')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' })
      await fetchDocuments()
    } catch (error) {
      console.error('Delete error:', error)
      setError('Failed to delete document')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Knowledge Base Admin</h2>
            <p className="text-sm text-slate-500 mt-1">Upload flight manuals for AI to search</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Upload Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Document Title
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., B777 FCOM Vol 1"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={isUploading}
              />
            </div>

            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer"
              onClick={() => document.getElementById('pdf-input')?.click()}
            >
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                {selectedFile ? (
                  <span className="text-blue-600 font-medium">{selectedFile.name}</span>
                ) : (
                  'Click to select PDF (max 100MB)'
                )}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-700">
                {error}
              </div>
            )}

            {uploadProgress && (
              <div className={`p-3 rounded-lg text-sm ${
                uploadProgress.startsWith('✓') 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {uploadProgress}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !docTitle.trim()}
              className={cn(
                'w-full py-3 rounded-xl font-semibold transition',
                selectedFile && !isUploading && docTitle.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {isUploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Uploaded Documents ({documents.length})
          </h3>

          {documents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-800">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        {doc.total_pages} pages • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
