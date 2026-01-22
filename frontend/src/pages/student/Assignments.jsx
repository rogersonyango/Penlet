import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Clock, CheckCircle, AlertCircle, Upload, Eye, X, Download, FileText, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { contentAPI, submissionsAPI, filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '');

export default function StudentAssignments() {
  const [filter, setFilter] = useState('all');
  const [viewAssignment, setViewAssignment] = useState(null);
  const [submitAssignment, setSubmitAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // PDF viewer state
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState(null);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => contentAPI.list({ content_type: 'assignment' }).then(res => res.data),
  });

  const { data: mySubmissions } = useQuery({
    queryKey: ['my-submissions'],
    queryFn: () => submissionsAPI.mySubmissions().then(res => res.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => submissionsAPI.submit(data),
    onSuccess: () => {
      toast.success('Assignment submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      setSubmitAssignment(null);
      setSubmissionFile(null);
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to submit'),
  });

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    if (fileUrl.startsWith('/api/v1')) {
      return `${API_BASE_URL}${fileUrl}`;
    }
    return `${API_BASE_URL}/api/v1${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  };

  const getSubmissionForAssignment = (assignmentId) => {
    return mySubmissions?.find(s => s.assignment_id === assignmentId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await filesAPI.uploadSubmission(file);
      setSubmissionFile({
        file_url: response.data.file_url,
        file_name: file.name,
      });
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Failed to upload file');
    }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!submissionFile) {
      toast.error('Please upload a file first');
      return;
    }
    submitMutation.mutate({
      assignment_id: submitAssignment.id,
      file_url: submissionFile.file_url,
    });
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  const getStatusInfo = (assignment) => {
    const submission = getSubmissionForAssignment(assignment.id);
    if (submission?.status === 'graded') {
      return { label: 'Graded', class: 'badge-success', icon: CheckCircle };
    }
    if (submission) {
      return { label: 'Submitted', class: 'badge-primary', icon: CheckCircle };
    }
    if (isOverdue(assignment.due_date)) {
      return { label: 'Overdue', class: 'badge-danger', icon: AlertCircle };
    }
    return { label: 'Pending', class: 'badge-warning', icon: Clock };
  };

  const filteredAssignments = assignments?.filter(a => {
    if (filter === 'all') return true;
    const submission = getSubmissionForAssignment(a.id);
    if (filter === 'pending') return !submission && !isOverdue(a.due_date);
    if (filter === 'submitted') return submission && submission.status !== 'graded';
    if (filter === 'graded') return submission?.status === 'graded';
    return true;
  });

  // PDF viewer handlers
  const handleViewAssignment = (assignment) => {
    setViewAssignment(assignment);
    setPageNumber(1);
    setScale(1.0);
    setPdfLoading(true);
    setPdfError(null);
    setNumPages(null);
  };

  const handleCloseViewer = () => {
    setViewAssignment(null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Assignments</h1>
        <p className="text-dark-400">View and submit your assignments</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'submitted', 'graded'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? 'active' : ''} capitalize`}>{f}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
      ) : filteredAssignments?.length > 0 ? (
        <div className="space-y-4">
          {filteredAssignments.map((assignment, i) => {
            const status = getStatusInfo(assignment);
            const StatusIcon = status.icon;
            const submission = getSubmissionForAssignment(assignment.id);
            const canSubmit = !submission && (!isOverdue(assignment.due_date) || assignment.allow_late_submission);
            
            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="dashboard-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-accent-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{assignment.title}</h3>
                      <p className="text-sm text-dark-400">{assignment.subject?.name}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm text-highlight-400">
                          <Clock className="w-4 h-4" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        <span className="text-sm text-dark-400">Max: {assignment.max_score} points</span>
                        <span className={`badge ${status.class} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                        {submission?.score !== undefined && submission?.score !== null && (
                          <span className="text-sm text-green-400 font-medium">
                            Score: {submission.score}/{assignment.max_score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleViewAssignment(assignment)}
                      className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> View
                    </button>
                    {canSubmit && (
                      <button 
                        onClick={() => setSubmitAssignment(assignment)}
                        className="btn-gradient py-2 px-3 text-sm flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Submit
                      </button>
                    )}
                    {submission && (
                      <button 
                        onClick={() => setSubmitAssignment(assignment)}
                        className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> {submission.status === 'graded' ? 'Grade' : 'Submitted'}
                      </button>
                    )}
                  </div>
                </div>
                {assignment.instructions && (
                  <p className="text-sm text-dark-400 mt-4 line-clamp-2">{assignment.instructions}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No assignments found</p>
        </div>
      )}

      {/* Assignment Viewer Modal with react-pdf */}
      <AnimatePresence>
        {viewAssignment && (
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
                  <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-accent-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{viewAssignment.title}</h2>
                    <p className="text-sm text-dark-400">{viewAssignment.subject?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {viewAssignment.file_url && (
                    <a
                      href={getFileUrl(viewAssignment.file_url)}
                      download
                      className="btn-gradient py-2 px-3 text-sm flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  )}
                  <button 
                    onClick={handleCloseViewer} 
                    className="p-2 text-dark-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Assignment Details */}
              <div className="p-4 border-b border-dark-700 bg-dark-750">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Due Date</p>
                    <p className="text-white text-sm font-medium">
                      {new Date(viewAssignment.due_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Maximum Score</p>
                    <p className="text-white text-sm font-medium">{viewAssignment.max_score} points</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Late Submission</p>
                    <p className="text-white text-sm font-medium">{viewAssignment.allow_late_submission ? 'Allowed' : 'Not Allowed'}</p>
                  </div>
                </div>
                {viewAssignment.instructions && (
                  <div className="mt-3 bg-dark-700/50 rounded-xl p-3">
                    <p className="text-xs text-dark-400 mb-1">Instructions</p>
                    <p className="text-dark-300 text-sm">{viewAssignment.instructions}</p>
                  </div>
                )}
              </div>

              {/* PDF Controls */}
              {viewAssignment.file_url && viewAssignment.file_url.toLowerCase().includes('.pdf') && !pdfLoading && !pdfError && numPages && (
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

              {/* PDF Content */}
              <div className="flex-1 overflow-auto bg-dark-700/50 flex justify-center p-4">
                {viewAssignment.file_url ? (
                  viewAssignment.file_url.toLowerCase().includes('.pdf') ? (
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
                              href={getFileUrl(viewAssignment.file_url)}
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
                        file={getFileUrl(viewAssignment.file_url)}
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
                        href={getFileUrl(viewAssignment.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-dark-700/50 rounded-xl p-6 hover:bg-dark-700 transition-colors"
                      >
                        <FileText className="w-10 h-10 text-primary-400" />
                        <div>
                          <p className="text-white font-medium">View Assignment File</p>
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
                      <p className="text-dark-400">No file attached to this assignment</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <AnimatePresence>
        {submitAssignment && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => { setSubmitAssignment(null); setSubmissionFile(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-dark-800 rounded-2xl border border-dark-700 my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">{submitAssignment.title}</h2>
                  <p className="text-sm text-dark-400">{submitAssignment.subject?.name}</p>
                </div>
                <button onClick={() => { setSubmitAssignment(null); setSubmissionFile(null); }} className="p-2 text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {(() => {
                  const submission = getSubmissionForAssignment(submitAssignment.id);
                  if (submission) {
                    return (
                      <div>
                        <h3 className="text-white font-medium mb-2">Your Submission</h3>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                            <div className="flex-1">
                              <p className="text-green-400 font-medium">Submitted</p>
                              <p className="text-sm text-dark-400">
                                {new Date(submission.submitted_at).toLocaleString()}
                              </p>
                            </div>
                            {submission.file_url && (
                              <a
                                href={getFileUrl(submission.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary py-2 px-3 text-sm"
                              >
                                View File
                              </a>
                            )}
                          </div>
                          {submission.status === 'graded' && (
                            <div className="mt-4 pt-4 border-t border-green-500/30">
                              <p className="text-white">
                                <span className="text-dark-400">Score:</span>{' '}
                                <span className="text-lg font-bold text-green-400">{submission.score}</span>
                                <span className="text-dark-400">/{submitAssignment.max_score}</span>
                              </p>
                              {submission.feedback && (
                                <p className="text-sm text-dark-300 mt-2">
                                  <span className="text-dark-400">Feedback:</span> {submission.feedback}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const canSubmit = !isOverdue(submitAssignment.due_date) || submitAssignment.allow_late_submission;
                  if (canSubmit) {
                    return (
                      <div>
                        <h3 className="text-white font-medium mb-2">Submit Your Work</h3>
                        <div className="bg-dark-700/50 rounded-xl p-4">
                          <input
                            type="file"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="submission-upload"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                          <label
                            htmlFor="submission-upload"
                            className="border-2 border-dashed border-dark-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors"
                          >
                            {uploading ? (
                              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                            ) : submissionFile ? (
                              <>
                                <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                                <p className="text-green-400">{submissionFile.file_name}</p>
                                <p className="text-sm text-dark-400">Click to change file</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 text-dark-500 mb-2" />
                                <p className="text-dark-400">Click to upload your submission</p>
                                <p className="text-xs text-dark-500 mt-1">PDF, DOC, DOCX, JPG, PNG</p>
                              </>
                            )}
                          </label>
                          <button
                            onClick={handleSubmit}
                            disabled={!submissionFile || submitMutation.isPending}
                            className="btn-gradient w-full mt-4 flex items-center justify-center gap-2"
                          >
                            {submitMutation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Upload className="w-5 h-5" />
                            )}
                            Submit Assignment
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                        <div>
                          <p className="text-red-400 font-medium">Submission Closed</p>
                          <p className="text-sm text-dark-400">The deadline has passed and late submissions are not allowed.</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}