import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, FileText, X, Download, Loader2, Star, Eye } from 'lucide-react';
import { submissionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function TeacherGrading() {
  const [filter, setFilter] = useState('pending');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [viewSubmission, setViewSubmission] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', filter],
    queryFn: () => submissionsAPI.list({ status: filter === 'all' ? undefined : filter }).then(res => res.data),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ id, data }) => submissionsAPI.grade(id, data),
    onSuccess: () => {
      toast.success('Submission graded successfully');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      setSelectedSubmission(null);
      setScore('');
      setFeedback('');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to grade'),
  });

  const handleGrade = () => {
    if (!score || isNaN(parseFloat(score))) {
      toast.error('Please enter a valid score');
      return;
    }
    gradeMutation.mutate({
      id: selectedSubmission.id,
      data: { score: parseFloat(score), feedback },
    });
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${API_URL}${fileUrl}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded': return 'text-green-400';
      case 'submitted': return 'text-accent-400';
      case 'late': return 'text-red-400';
      default: return 'text-highlight-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Grade Submissions</h1>
        <p className="text-dark-400">Review and grade student work</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['pending', 'submitted', 'graded', 'late', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`tab ${filter === f ? 'active' : ''} capitalize`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : submissions?.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((submission, i) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="dashboard-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-accent-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{submission.assignment?.title || 'Assignment'}</h3>
                    <p className="text-sm text-dark-400">
                      By: {submission.student?.first_name} {submission.student?.last_name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={`flex items-center gap-1 ${getStatusColor(submission.status)}`}>
                        {submission.status === 'graded' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {submission.status}
                      </span>
                      <span className="text-dark-500">
                        Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                      </span>
                      {submission.score !== null && (
                        <span className="flex items-center gap-1 text-highlight-400">
                          <Star className="w-4 h-4" />
                          {submission.score}/{submission.assignment?.max_score || 100}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {submission.file_url && (
                    <button
                      onClick={() => setViewSubmission(submission)}
                      className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  )}
                  {submission.status !== 'graded' && (
                    <button
                      onClick={() => {
                        setSelectedSubmission(submission);
                        setScore(submission.score?.toString() || '');
                        setFeedback(submission.feedback || '');
                      }}
                      className="btn-gradient py-2 px-4 text-sm"
                    >
                      Grade
                    </button>
                  )}
                </div>
              </div>
              {submission.content && (
                <div className="mt-4 p-4 bg-dark-700/30 rounded-lg">
                  <p className="text-sm text-dark-300 line-clamp-3">{submission.content}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No submissions to review</p>
        </div>
      )}

      {/* File Viewer Modal */}
      <AnimatePresence>
        {viewSubmission && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewSubmission(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl h-[90vh] bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {viewSubmission.assignment?.title || 'Submission'}
                  </h2>
                  <p className="text-sm text-dark-400">
                    By: {viewSubmission.student?.first_name} {viewSubmission.student?.last_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(viewSubmission.file_url)}
                    download
                    className="btn-secondary py-2 px-3 text-sm flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Download
                  </a>
                  <button onClick={() => setViewSubmission(null)} className="p-2 text-dark-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4">
                {viewSubmission.file_url?.includes('.pdf') ? (
                  <iframe
                    src={getFileUrl(viewSubmission.file_url)}
                    className="w-full h-full rounded-lg border border-dark-700"
                    title="Submission"
                  />
                ) : viewSubmission.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="flex items-center justify-center h-full">
                    <img 
                      src={getFileUrl(viewSubmission.file_url)} 
                      alt="Submission" 
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <FileText className="w-16 h-16 text-dark-500 mb-4" />
                    <p className="text-dark-400 mb-4">Preview not available for this file type</p>
                    <a
                      href={getFileUrl(viewSubmission.file_url)}
                      download
                      className="btn-gradient flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" /> Download File
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grade Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedSubmission(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-dark-800 rounded-2xl border border-dark-700 p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Grade Submission</h2>
                <button onClick={() => setSelectedSubmission(null)} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-dark-400 mb-2">Assignment</p>
                <p className="text-white font-medium">{selectedSubmission.assignment?.title}</p>
              </div>

              <div className="mb-6">
                <p className="text-dark-400 mb-2">Student</p>
                <p className="text-white">{selectedSubmission.student?.first_name} {selectedSubmission.student?.last_name}</p>
              </div>

              {selectedSubmission.file_url && (
                <div className="mb-6">
                  <p className="text-dark-400 mb-2">Submitted File</p>
                  <button
                    onClick={() => {
                      setViewSubmission(selectedSubmission);
                    }}
                    className="flex items-center gap-3 w-full bg-dark-700/50 rounded-lg p-3 hover:bg-dark-700 transition-colors"
                  >
                    <FileText className="w-6 h-6 text-primary-400" />
                    <span className="text-white flex-1 text-left">View Submission File</span>
                    <Eye className="w-5 h-5 text-dark-400" />
                  </button>
                </div>
              )}

              {selectedSubmission.content && (
                <div className="mb-6">
                  <p className="text-dark-400 mb-2">Submission Content</p>
                  <div className="p-4 bg-dark-700/50 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-dark-200 text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                  </div>
                </div>
              )}

              <div className="form-group mb-4">
                <label className="form-label">Score (out of {selectedSubmission.assignment?.max_score || 100})</label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="input-field"
                  placeholder="Enter score"
                  min="0"
                  max={selectedSubmission.assignment?.max_score || 100}
                />
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Feedback (optional)</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedSubmission(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleGrade}
                  disabled={gradeMutation.isPending}
                  className="btn-gradient flex-1 flex items-center justify-center gap-2"
                >
                  {gradeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Submit Grade
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}