import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Clock, MapPin, X, Trash2, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { timetableAPI, subjectsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function StudentTimetable() {
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const queryClient = useQueryClient();
  
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: () => timetableAPI.weekSchedule().then(res => res.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['my-subjects'],
    queryFn: () => subjectsAPI.mySubjects().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => timetableAPI.create(data),
    onSuccess: () => {
      toast.success('Entry added to timetable!');
      queryClient.invalidateQueries(['timetable']);
      setShowModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add entry');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => timetableAPI.update(id, data),
    onSuccess: () => {
      toast.success('Entry updated!');
      queryClient.invalidateQueries(['timetable']);
      setShowModal(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => timetableAPI.delete(id),
    onSuccess: () => {
      toast.success('Entry deleted');
      queryClient.invalidateQueries(['timetable']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete entry');
    },
  });

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Timetable</h1>
          <p className="text-dark-400">Manage your weekly schedule</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gradient flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Entry
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {DAYS.map((day, i) => (
            <motion.div
              key={day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="dashboard-card"
            >
              <h3 className="font-semibold text-white mb-4">{day}</h3>
              {schedule?.[day]?.length > 0 ? (
                <div className="space-y-2">
                  {schedule[day].map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/30 group"
                      style={{ borderLeft: `3px solid ${entry.color || COLORS[0]}` }}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-white">{entry.title}</p>
                        <div className="flex items-center gap-4 text-sm text-dark-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.start_time} - {entry.end_time}
                          </span>
                          {entry.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.location}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-xs text-dark-500 mt-1">{entry.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-dark-400 hover:text-primary-400 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(entry.id)}
                          className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-dark-500">No classes scheduled</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <TimetableModal
            onClose={handleCloseModal}
            onSubmit={(data) => {
              if (editingEntry) {
                updateMutation.mutate({ id: editingEntry.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            isLoading={createMutation.isPending || updateMutation.isPending}
            editingEntry={editingEntry}
            subjects={subjects}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TimetableModal({ onClose, onSubmit, isLoading, editingEntry, subjects }) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: editingEntry ? {
      title: editingEntry.title,
      day_of_week: editingEntry.day_of_week,
      start_time: editingEntry.start_time,
      end_time: editingEntry.end_time,
      location: editingEntry.location || '',
      color: editingEntry.color || COLORS[0],
      notes: editingEntry.notes || '',
      subject_id: editingEntry.subject_id || '',
    } : {
      color: COLORS[0],
      day_of_week: 0,
    },
  });

  const selectedColor = watch('color');

  const onFormSubmit = (data) => {
    data.day_of_week = parseInt(data.day_of_week);
    if (!data.subject_id) delete data.subject_id;
    onSubmit(data);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">
            {editingEntry ? 'Edit Entry' : 'Add Timetable Entry'}
          </h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="input-field"
              placeholder="e.g., Mathematics Class"
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Subject (Optional)</label>
            <select {...register('subject_id')} className="input-field">
              <option value="">Select a subject</option>
              {subjects?.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Day *</label>
            <select {...register('day_of_week', { required: 'Day is required' })} className="input-field">
              {DAYS.map((day, i) => (
                <option key={day} value={i}>{day}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Start Time *</label>
              <input
                type="time"
                {...register('start_time', { required: 'Start time is required' })}
                className="input-field"
              />
              {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">End Time *</label>
              <input
                type="time"
                {...register('end_time', { required: 'End time is required' })}
                className="input-field"
              />
              {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              {...register('location')}
              className="input-field"
              placeholder="e.g., Room 101"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="flex gap-2">
              {COLORS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('color')}
                    value={color}
                    className="sr-only"
                  />
                  <div
                    className={`w-8 h-8 rounded-full transition-transform ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              {...register('notes')}
              className="input-field resize-none"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-gradient flex-1">
              {isLoading ? 'Saving...' : editingEntry ? 'Update' : 'Add Entry'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
