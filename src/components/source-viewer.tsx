'use client'

import { useState } from 'react'
import { X, BookOpen } from 'lucide-react'

interface SourceViewerProps {
  isOpen: boolean
  onClose: () => void
  page: number | null
  document: string | null
  content?: string
}

export function SourceViewer({ isOpen, onClose, page, document, content }: SourceViewerProps) {
  if (!isOpen || page === null) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800">
              Source: {document} - Page {page}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {content ? (
            <div className="prose prose-sm max-w-none font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Source text not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
