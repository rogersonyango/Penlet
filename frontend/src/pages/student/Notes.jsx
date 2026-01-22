import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye, Search, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { contentAPI } from '../../services/api';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');

export default function StudentNotes() {
  const [search, setSearch] = useState('');
  const [viewNote, setViewNote] = useState(null);
  
  // PDF viewer state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);
  
  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => contentAPI.list({ content_type: 'note' }).then(res => res.data),
  });

  const filteredNotes = notes?.filter(note => 
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    if (fileUrl.startsWith('/api/v1')) {
      return `${API_BASE_URL}${fileUrl}`;
    }
    return `${API_BASE_URL}/api/v1${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  };

  const handleViewNote = (note) => {
    setViewNote(note);
    setPageNumber(1);
    setScale(1.0);
    setPdfLoading(true);
    setPdfError(null);
    setNumPages(null);
  };

  const handleCloseViewer = () => {
    setViewNote(null);
    setPageNumber(1);
    setScale(1.0);
    setPdfLoading(true);
    setPdfError(null);
    setNumPages(null);
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF load error:', error);
    setPdfError('Failed to load PDF');
    setPdfLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Study Notes</h1>
          <p className="text-dark-400">Download and view study materials</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : filteredNotes?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="dashboard-card group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{note.title}</h3>
                  <p className="text-sm text-dark-400">{note.subject?.name}</p>
                </div>
              </div>
              <p className="text-sm text-dark-400 mt-3 line-clamp-2">{note.description}</p>
              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={() => handleViewNote(note)}
                  className="flex-1 btn-secondary py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
                <a 
                  href={getFileUrl(note.file_url)} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 btn-gradient py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No notes available yet</p>
        </div>
      )}

      {/* PDF Viewer Modal with react-pdf */}
      <AnimatePresence>
        {viewNote && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseViewer}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl h-[90vh] bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{viewNote.title}</h2>
                    <p className="text-sm text-dark-400">{viewNote.subject?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(viewNote.file_url)}
                    download
                    className="btn-gradient py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button 
                    onClick={handleCloseViewer} 
                    className="p-2 text-dark-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* PDF Controls */}
              {!pdfLoading && !pdfError && numPages && (
                <div className="flex items-center justify-center gap-4 p-3 border-b border-dark-700 bg-dark-750">
                  {/* Page Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={pageNumber <= 1}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-dark-300 text-sm min-w-[100px] text-center">
                      Page {pageNumber} of {numPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={pageNumber >= numPages}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2 border-l border-dark-600 pl-4">
                    <button
                      onClick={zoomOut}
                      disabled={scale <= 0.5}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <span className="text-dark-300 text-sm min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      disabled={scale >= 2.5}
                      className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Content */}
              <div className="flex-1 overflow-auto bg-dark-700/50 flex justify-center p-4">
                {pdfLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
                      <p className="text-dark-400">Loading PDF...</p>
                    </div>
                  </div>
                )}

                {pdfError && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">Unable to load PDF</h3>
                      <p className="text-dark-400 mb-4">{pdfError}</p>
                      <a
                        href={getFileUrl(viewNote.file_url)}
                        download
                        className="btn-gradient inline-flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Instead
                      </a>
                    </div>
                  </div>
                )}

                <Document
                  file={getFileUrl(viewNote.file_url)}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading=""
                  className={pdfLoading || pdfError ? 'hidden' : ''}
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-xl"
                  />
                </Document>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}