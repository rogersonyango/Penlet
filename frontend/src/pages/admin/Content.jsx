import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, ClipboardList, CheckCircle, XCircle, Eye, X, Clock, Loader2, Download, Play } from 'lucide-react';
import { contentAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function AdminContent() {
  const [filter, setFilter] = useState('pending');
  const [selectedContent, setSelectedContent] = useState(null);
  const [viewContent, setViewContent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const queryClient = useQueryClient();

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-content', filter],
    queryFn: () => filter === 'pending' 
      ? adminAPI.pendingContent().then(res => res.data)
      : contentAPI.list({ status: filter === 'all' ? undefined : filter }).then(res => res.data),
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
    // If it starts with http, return as is
    if (fileUrl.startsWith('http')) return fileUrl;
    // Otherwise, prepend API URL
    return `${API_URL}${fileUrl}`;
  };

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
                      onClick={() => setViewContent(item)}
                      className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {item.status === 'pending' && (
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

      {/* Content Viewer Modal */}
      <AnimatePresence>
        {viewContent && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setViewContent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-dark-800 rounded-2xl border border-dark-700 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{viewContent.title}</h2>
                  <p className="text-sm text-dark-400">{viewContent.subject?.name} • {viewContent.content_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {viewContent.file_url && (
                    <a
                      href={getFileUrl(viewContent.file_url)}
                      download
                      className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => setViewContent(null)} className="p-2 text-dark-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
                {/* Assignment Details */}
                {viewContent.content_type === 'assignment' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-sm text-dark-400 mb-1">Due Date</p>
                        <p className="text-white font-medium">
                          {viewContent.due_date ? new Date(viewContent.due_date).toLocaleString() : 'Not set'}
                        </p>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-sm text-dark-400 mb-1">Maximum Score</p>
                        <p className="text-white font-medium">{viewContent.max_score || 100} points</p>
                      </div>
                      <div className="bg-dark-700/50 rounded-xl p-4">
                        <p className="text-sm text-dark-400 mb-1">Late Submission</p>
                        <p className="text-white font-medium">{viewContent.allow_late_submission ? 'Allowed' : 'Not Allowed'}</p>
                      </div>
                    </div>

                    {viewContent.instructions && (
                      <div>
                        <h3 className="text-white font-medium mb-2">Instructions</h3>
                        <div className="bg-dark-700/50 rounded-xl p-4">
                          <p className="text-dark-300 whitespace-pre-wrap">{viewContent.instructions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Description */}
                {viewContent.description && (
                  <div>
                    <h3 className="text-white font-medium mb-2">Description</h3>
                    <div className="bg-dark-700/50 rounded-xl p-4">
                      <p className="text-dark-300">{viewContent.description}</p>
                    </div>
                  </div>
                )}

                {/* File Preview */}
                {viewContent.file_url && (
                  <div>
                    <h3 className="text-white font-medium mb-2">Attached File</h3>
                    {viewContent.content_type === 'video' ? (
                      <video 
                        controls 
                        className="w-full rounded-lg bg-black"
                        src={getFileUrl(viewContent.file_url)}
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : viewContent.file_url?.includes('.pdf') || viewContent.mime_type === 'application/pdf' ? (
                      <iframe
                        src={getFileUrl(viewContent.file_url)}
                        className="w-full h-[60vh] rounded-lg border border-dark-700"
                        title={viewContent.title}
                      />
                    ) : (
                      <a
                        href={getFileUrl(viewContent.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-dark-700/50 rounded-xl p-4 hover:bg-dark-700 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-primary-400" />
                        <div className="flex-1">
                          <p className="text-white">View Attachment</p>
                          <p className="text-sm text-dark-400">Click to download</p>
                        </div>
                        <Download className="w-5 h-5 text-dark-400" />
                      </a>
                    )}
                  </div>
                )}

                {/* No file message for assignments */}
                {!viewContent.file_url && viewContent.content_type === 'assignment' && (
                  <div className="bg-dark-700/30 rounded-xl p-6 text-center">
                    <FileText className="w-12 h-12 text-dark-500 mx-auto mb-2" />
                    <p className="text-dark-400">No file attached to this assignment</p>
                  </div>
                )}

                {/* Uploader Info */}
                <div className="pt-4 border-t border-dark-700">
                  <p className="text-sm text-dark-400">
                    <span className="text-white">Uploaded by:</span> {viewContent.uploader?.first_name} {viewContent.uploader?.last_name}
                  </p>
                  {viewContent.target_classes?.length > 0 && (
                    <p className="text-sm text-dark-400 mt-1">
                      <span className="text-white">Target Classes:</span> {viewContent.target_classes.join(', ')}
                    </p>
                  )}
                </div>
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