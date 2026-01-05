import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, X, Loader2, Edit, Trash2, Users } from 'lucide-react';
import { subjectsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CLASS_LEVELS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
const ICONS = ['📚', '🔬', '🧮', '🌍', '📝', '🎨', '💻', '🏃', '🎵', '📖'];

export default function AdminSubjects() {
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: () => subjectsAPI.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => subjectsAPI.create(data),
    onSuccess: () => {
      toast.success('Subject created');
      queryClient.invalidateQueries(['all-subjects']);
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => subjectsAPI.update(id, data),
    onSuccess: () => {
      toast.success('Subject updated');
      queryClient.invalidateQueries(['all-subjects']);
      closeModal();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => subjectsAPI.delete(id),
    onSuccess: () => {
      toast.success('Subject deleted');
      queryClient.invalidateQueries(['all-subjects']);
    },
  });

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setValue('name', subject.name);
      setValue('code', subject.code);
      setValue('description', subject.description);
      setValue('icon', subject.icon);
      setValue('class_levels', subject.class_levels || []);
    } else {
      setEditingSubject(null);
      reset();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    reset();
  };

  const onSubmit = (data) => {
    data.class_levels = data.class_levels?.filter(Boolean) || CLASS_LEVELS;
    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subject Management</h1>
          <p className="text-dark-400">Create and manage curriculum subjects</p>
        </div>
        <button onClick={() => openModal()} className="btn-gradient flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Subject
        </button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
        </div>
      ) : subjects?.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="dashboard-card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-2xl">
                    {subject.icon || '📚'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{subject.name}</h3>
                    <p className="text-sm text-dark-400">{subject.code}</p>
                  </div>
                </div>
                <span className={`badge ${subject.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {subject.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-dark-400 line-clamp-2 mb-4">{subject.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {subject.class_levels?.slice(0, 3).map(level => (
                    <span key={level} className="text-xs px-2 py-0.5 bg-dark-700 rounded text-dark-300">{level}</span>
                  ))}
                  {subject.class_levels?.length > 3 && (
                    <span className="text-xs text-dark-500">+{subject.class_levels.length - 3}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(subject)} className="p-2 text-dark-400 hover:text-white">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(subject.id)} className="p-2 text-dark-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400">No subjects created yet</p>
          <button onClick={() => openModal()} className="text-primary-400 hover:text-primary-300 mt-2">
            Create your first subject
          </button>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <div className="modal-backdrop" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content p-6 max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingSubject ? 'Edit Subject' : 'Add Subject'}
                </h2>
                <button onClick={closeModal} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input {...register('name', { required: 'Required' })} className="input-field" placeholder="e.g. Mathematics" />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Code *</label>
                  <input {...register('code', { required: 'Required' })} className="input-field" placeholder="e.g. MATH" />
                  {errors.code && <p className="form-error">{errors.code.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea {...register('description')} className="input-field" rows={3} placeholder="Subject description" />
                </div>

                <div className="form-group">
                  <label className="form-label">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map(icon => (
                      <label key={icon} className="cursor-pointer">
                        <input type="radio" value={icon} {...register('icon')} className="hidden peer" />
                        <span className="block w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center text-xl peer-checked:bg-primary-500/30 peer-checked:ring-2 peer-checked:ring-primary-500">
                          {icon}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Class Levels</label>
                  <div className="flex flex-wrap gap-2">
                    {CLASS_LEVELS.map(level => (
                      <label key={level} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" value={level} {...register('class_levels')} className="checkbox" />
                        <span className="text-sm text-dark-300">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-gradient flex-1 flex items-center justify-center gap-2">
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {editingSubject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}