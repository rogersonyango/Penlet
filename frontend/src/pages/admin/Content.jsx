import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, ClipboardList, CheckCircle, XCircle, Eye, X, Clock, Loader2, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { contentAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');

export default function AdminContent() {
  const [filter, setFilter] = useState('pending');
  const [selectedContent, setSelectedContent] = useState(null);
  const [viewContent, setViewContent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  // PDF viewer state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-content', filter],
    queryFn: async () => {
      if (filter === 'pending') {
        const res = await adminAPI.pendingContent();
        // Normalize pending content to match expected structure
        return (res.data || []).map(item => ({ 
          ...item, 
          status: item.status || 'pending',
          // Handle different field names for file URL
          file_url: item.file_url || item.fileUrl || item.file || item.attachment || item.attachment_url,
          // Handle subject as string or object
          subject: typeof item.subject === 'string' ? { name: item.subject } : item.subject,
          // Handle uploader as string or object  
          uploader: typeof item.uploader === 'string' 
            ? { first_name: item.uploader, last_name: '' } 
            : item.uploader,
        }));
      }
      const res = await contentAPI.list({ status: filter === 'all' ? undefined : filter });
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, reason }) => contentAPI.approve(id, { status, rejection_reason: reason }),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'Content approved' : 'Content rejected');
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      setSelectedContent(null);
      setRejectReason('');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to process'),
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return Video;
      case 'assignment': return ClipboardList;
      default: return FileText;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      default: return 'badge-warning';
    }
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    if (fileUrl.startsWith('/api/v1')) {
      return `${API_BASE_URL}${fileUrl}`;
    }
    return `${API_BASE_URL}/api/v1${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  };

  // PDF viewer handlers
  const handleViewContent = (item) => {
    console.log('Viewing content:', item); // Debug log
    console.log('File URL:', item.file_url); // Debug log
    setViewContent(item);
    setPageNumber(1);
    setScale(1.0);
    setPdfLoading(true);
    setPdfError(null);
    setNumPages(null);
  };

  const handleCloseViewer = () => {
    setViewContent(null);
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

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const isPdf = (fileUrl) => fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Content Management</h1>
        <p className="text-dark-400">Review and approve uploaded content</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? 'active' : ''} capitalize`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : content?.length > 0 ? (
        <div className="space-y-4">
          {content.map((item, i) => {
            const TypeIcon = getTypeIcon(item.content_type);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="dashboard-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                      <TypeIcon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="text-sm text-dark-400">
                        {item.subject?.name || item.subject} • By {item.uploader?.first_name || item.uploader} {item.uploader?.last_name || ''}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`badge ${getStatusBadge(item.status)} capitalize`}>{item.status}</span>
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-dark-500 capitalize">{item.content_type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewContent(item)}
                      className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {(item.status === 'pending' || filter === 'pending') && (
                      <>
                        <button
                          onClick={() => approveMutation.mutate({ id: item.id, status: 'approved' })}
                          className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                          disabled={approveMutation.isPending}
                          title="Approve"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedContent(item)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-dark-400 mt-3 line-clamp-2">{item.description}</p>
                )}
                {item.status === 'rejected' && item.rejection_reason && (
                  <p className="text-sm text-red-400 mt-2 bg-red-500/10 p-2 rounded-lg">
                    <strong>Rejection reason:</strong> {item.rejection_reason}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">
            {filter === 'pending' ? 'No content pending approval' : 'No content found'}
          </p>
        </div>
      )}

      {/* Content Viewer Modal with react-pdf */}
      <AnimatePresence>
        {viewContent && (
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
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    {viewContent.content_type === 'video' ? (
                      <Video className="w-5 h-5 text-primary-400" />
                    ) : viewContent.content_type === 'assignment' ? (
                      <ClipboardList className="w-5 h-5 text-primary-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{viewContent.title}</h2>
                    <p className="text-sm text-dark-400">
                      {viewContent.subject?.name} • By {viewContent.uploader?.first_name} {viewContent.uploader?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewContent.file_url && (
                    <a
                      href={getFileUrl(viewContent.file_url)}
                      download
                      className="btn-gradient py-2 px-3 text-sm flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  )}
                  <button onClick={handleCloseViewer} className="p-2 text-dark-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-4 border-b border-dark-700 bg-dark-750 space-y-3">
                {viewContent.content_type === 'assignment' && (
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="bg-dark-700/50 rounded-xl p-3">
                      <p className="text-xs text-dark-400 mb-1">Due Date</p>
                      <p className="text-white text-sm font-medium">
                        {viewContent.due_date ? new Date(viewContent.due_date).toLocaleString() : 'Not set'}
                      </p>
                    </div>
                    <div className="bg-dark-700/50 rounded-xl p-3">
                      <p className="text-xs text-dark-400 mb-1">Maximum Score</p>
                      <p className="text-white text-sm font-medium">{viewContent.max_score || 100} points</p>
                    </div>
                    <div className="bg-dark-700/50 rounded-xl p-3">
                      <p className="text-xs text-dark-400 mb-1">Late Submission</p>
                      <p className="text-white text-sm font-medium">{viewContent.allow_late_submission ? 'Allowed' : 'Not Allowed'}</p>
                    </div>
                  </div>
                )}
                {viewContent.instructions && (
                  <div className="bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Instructions</p>
                    <p className="text-dark-300 text-sm">{viewContent.instructions}</p>
                  </div>
                )}
                {viewContent.description && (
                  <div className="bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Description</p>
                    <p className="text-dark-300 text-sm">{viewContent.description}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-dark-400">
                  {viewContent.target_classes?.length > 0 && (
                    <span><span className="text-white">Target Classes:</span> {viewContent.target_classes.join(', ')}</span>
                  )}
                  <span><span className="text-white">Status:</span> <span className={`capitalize ${viewContent.status === 'approved' ? 'text-green-400' : viewContent.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>{viewContent.status}</span></span>
                </div>
              </div>

              {/* PDF Controls */}
              {viewContent.file_url && isPdf(viewContent.file_url) && !pdfLoading && !pdfError && numPages && (
                <div className="flex items-center justify-center gap-4 p-3 border-b border-dark-700 bg-dark-750">
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

              {/* Content Display */}
              <div className="flex-1 overflow-auto bg-dark-700/50 flex justify-center p-4">
                {viewContent.file_url ? (
                  viewContent.content_type === 'video' ? (
                    <video 
                      controls 
                      className="max-w-full max-h-full rounded-lg bg-black"
                      src={getFileUrl(viewContent.file_url)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : isPdf(viewContent.file_url) ? (
                    <>
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
                              href={getFileUrl(viewContent.file_url)}
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
                        file={getFileUrl(viewContent.file_url)}
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
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <a
                        href={getFileUrl(viewContent.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-dark-700/50 rounded-xl p-6 hover:bg-dark-700 transition-colors"
                      >
                        <FileText className="w-10 h-10 text-primary-400" />
                        <div>
                          <p className="text-white font-medium">View Attachment</p>
                          <p className="text-sm text-dark-400">Click to download</p>
                        </div>
                        <Download className="w-6 h-6 text-dark-400" />
                      </a>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                      <p className="text-dark-400">No file attached</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {selectedContent && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedContent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Reject Content</h2>
                <button onClick={() => setSelectedContent(null)} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-dark-400 mb-1">Content</p>
                <p className="text-white font-medium">{selectedContent.title}</p>
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Rejection Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Explain why this content is being rejected..."
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedContent(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate({ id: selectedContent.id, status: 'rejected', reason: rejectReason })}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  {approveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                  Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}