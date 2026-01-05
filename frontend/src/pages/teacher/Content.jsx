import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video, ClipboardList, Plus, Upload, X, Loader2, Eye, Trash2, Download } from 'lucide-react';
import { contentAPI, subjectsAPI, filesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const CONTENT_TYPES = [
  { id: 'note', label: 'Notes', icon: FileText, color: 'primary' },
  { id: 'video', label: 'Video', icon: Video, color: 'red' },
  { id: 'assignment', label: 'Assignment', icon: ClipboardList, color: 'accent' },
];

const CLASS_LEVELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export default function TeacherContent() {
  const [showModal, setShowModal] = useState(false);
  const [viewContent, setViewContent] = useState(null);
  const [contentType, setContentType] = useState('note');
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const { data: content, isLoading } = useQuery({
    queryKey: ['my-content'],
    queryFn: () => contentAPI.list({ uploaded_by_me: true }).then(res => res.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => subjectsAPI.mySubjects().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      if (contentType === 'note') return contentAPI.createNote(data);
      if (contentType === 'video') return contentAPI.createVideo(data);
      return contentAPI.createAssignment(data);
    },
    onSuccess: () => {
      toast.success('Content uploaded successfully! Pending approval.');
      queryClient.invalidateQueries({ queryKey: ['my-content'] });
      setShowModal(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to upload'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => contentAPI.delete(id),
    onSuccess: () => {
      toast.success('Content deleted');
      queryClient.invalidateQueries({ queryKey: ['my-content'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      let response;
      if (contentType === 'note') {
        response = await filesAPI.uploadNote(file);
      } else if (contentType === 'video') {
        response = await filesAPI.uploadVideo(file);
      } else {
        response = await filesAPI.uploadSubmission(file);
      }
      setValue('file_url', response.data.file_url);
      setValue('file_size', response.data.file_size);
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Failed to upload file');
    }
    setUploadingFile(false);
  };

  const onSubmit = (data) => {
    // Validate file upload is present
    if (!data.file_url) {
      toast.error('Please upload a file');
      return;
    }
    data.target_classes = data.target_classes || [];
    createMutation.mutate(data);
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
    return `${API_URL}${fileUrl}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Content</h1>
          <p className="text-dark-400">Upload and manage educational content</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gradient flex items-center gap-2">
          <Plus className="w-5 h-5" /> Upload Content
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : content?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.map((item, i) => {
            const TypeIcon = CONTENT_TYPES.find(t => t.id === item.content_type)?.icon || FileText;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="dashboard-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white line-clamp-1">{item.title}</h3>
                      <p className="text-sm text-dark-400">{item.subject?.name}</p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusBadge(item.status)} capitalize`}>{item.status}</span>
                </div>
                <p className="text-sm text-dark-400 line-clamp-2 mb-4">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dark-500">{item.target_classes?.join(', ') || 'All classes'}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setViewContent(item)}
                      className="p-2 text-dark-400 hover:text-white"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(item.id)} 
                      className="p-2 text-dark-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Upload className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No content uploaded yet</p>
          <button onClick={() => setShowModal(true)} className="text-primary-400 hover:text-primary-300 mt-2">
            Upload your first content
          </button>
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
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  )}
                  <button onClick={() => setViewContent(null)} className="p-2 text-dark-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6 max-h-[75vh] overflow-y-auto">
                {/* Assignment Details */}
                {viewContent.content_type === 'assignment' && (
                  <div className="space-y-4 mb-6">
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
                  <div className="mb-4">
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
                    ) : viewContent.file_url?.includes('.pdf') ? (
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

                {/* Target Classes */}
                {viewContent.target_classes?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dark-700">
                    <p className="text-sm text-dark-400">
                      <span className="text-white">Target Classes:</span> {viewContent.target_classes.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-dark-800 rounded-2xl border border-dark-700 my-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <h2 className="text-xl font-semibold text-white">Upload Content</h2>
                <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex gap-2 mb-6">
                  {CONTENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-colors ${
                        contentType === type.id ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      {type.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input {...register('title', { required: 'Title is required' })} className="input-field" placeholder="Enter title" />
                    {errors.title && <p className="form-error">{errors.title.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject *</label>
                    <select {...register('subject_id', { required: 'Subject is required' })} className="input-field">
                      <option value="">Select subject</option>
                      {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {errors.subject_id && <p className="form-error">{errors.subject_id.message}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea {...register('description')} className="input-field" rows={3} placeholder="Enter description" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Classes</label>
                    <div className="flex flex-wrap gap-2">
                      {CLASS_LEVELS.map(level => (
                        <label key={level} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" value={level} {...register('target_classes')} className="checkbox" />
                          <span className="text-sm text-dark-300">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {contentType === 'assignment' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label">Due Date *</label>
                          <input type="datetime-local" {...register('due_date', { required: contentType === 'assignment' })} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Score</label>
                          <input type="number" {...register('max_score')} className="input-field" defaultValue={100} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Instructions</label>
                        <textarea {...register('instructions')} className="input-field" rows={3} placeholder="Assignment instructions" />
                      </div>
                    </>
                  )}

                  {contentType === 'video' && (
                    <div className="form-group">
                      <label className="form-label">Video URL (optional)</label>
                      <input {...register('video_url')} className="input-field" placeholder="YouTube or video URL" />
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Upload File *</label>
                    <div className="border-2 border-dashed border-dark-600 rounded-xl p-6 text-center">
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        id="file-upload" 
                        accept={contentType === 'note' ? '.pdf,.doc,.docx' : contentType === 'video' ? 'video/*' : '.pdf,.doc,.docx,.jpg,.jpeg,.png'} 
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {uploadingFile ? (
                          <Loader2 className="w-8 h-8 text-primary-400 mx-auto animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                            <p className="text-sm text-dark-400">Click to upload or drag and drop</p>
                            <p className="text-xs text-dark-500 mt-1">
                              {contentType === 'note' ? 'PDF, DOC, DOCX files' : contentType === 'video' ? 'MP4, WebM, MOV' : 'PDF, DOC, DOCX, Images'}
                            </p>
                          </>
                        )}
                      </label>
                      {watch('file_url') && <p className="text-sm text-green-400 mt-2">File uploaded ✓</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={createMutation.isPending} className="btn-gradient flex-1 flex items-center justify-center gap-2">
                      {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      Upload
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}