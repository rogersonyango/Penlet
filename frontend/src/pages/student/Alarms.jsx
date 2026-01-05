import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Clock, Trash2, BellOff, X, Repeat } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { alarmsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentAlarms() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: alarms, isLoading } = useQuery({
    queryKey: ['alarms'],
    queryFn: () => alarmsAPI.list().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => alarmsAPI.create(data),
    onSuccess: () => {
      toast.success('Alarm created!');
      queryClient.invalidateQueries(['alarms']);
      setShowCreate(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create alarm');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => alarmsAPI.delete(id),
    onSuccess: () => {
      toast.success('Alarm deleted');
      queryClient.invalidateQueries(['alarms']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete alarm');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => alarmsAPI.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['alarms']);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alarms & Reminders</h1>
          <p className="text-dark-400">Set reminders for your studies</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-gradient flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Alarm
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : alarms?.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {alarms.map((alarm, i) => (
            <motion.div 
              key={alarm.id} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }} 
              className="dashboard-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleMutation.mutate({ id: alarm.id, is_active: !alarm.is_active })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      alarm.is_active ? 'bg-primary-500/20 hover:bg-primary-500/30' : 'bg-dark-700 hover:bg-dark-600'
                    }`}
                  >
                    {alarm.is_active ? (
                      <Bell className="w-5 h-5 text-primary-400" />
                    ) : (
                      <BellOff className="w-5 h-5 text-dark-500" />
                    )}
                  </button>
                  <div>
                    <h3 className="font-medium text-white">{alarm.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-dark-400 mt-1">
                      <Clock className="w-4 h-4" />
                      {new Date(alarm.alarm_time).toLocaleString()}
                    </div>
                    {alarm.is_recurring && (
                      <div className="flex items-center gap-1 text-xs text-accent-400 mt-1">
                        <Repeat className="w-3 h-3" />
                        {alarm.recurrence_pattern || 'Recurring'}
                      </div>
                    )}
                    {alarm.description && (
                      <p className="text-sm text-dark-500 mt-2">{alarm.description}</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => deleteMutation.mutate(alarm.id)} 
                  className="p-2 text-dark-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 mb-4">No alarms set. Create one to get started!</p>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateAlarmModal
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createMutation.mutate(data)}
            isLoading={createMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateAlarmModal({ onClose, onSubmit, isLoading }) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      is_active: true,
      is_recurring: false,
    },
  });

  const isRecurring = watch('is_recurring');

  const onFormSubmit = (data) => {
    // Format datetime as ISO string without timezone conversion
    // This preserves the local time the user selected
    const formData = {
      title: data.title,
      description: data.description || null,
      alarm_time: `${data.alarm_date}T${data.alarm_time}:00`,
      is_active: data.is_active,
      is_recurring: data.is_recurring,
      recurrence_pattern: data.is_recurring ? data.recurrence_pattern : null,
    };
    onSubmit(formData);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">Create Alarm</h2>
          <button onClick={onClose} className="p-2 text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="input-field"
              placeholder="e.g., Study Math"
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              {...register('description')}
              className="input-field resize-none"
              rows={2}
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                {...register('alarm_date', { required: 'Date is required' })}
                className="input-field"
                min={today}
              />
              {errors.alarm_date && <p className="form-error">{errors.alarm_date.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <input
                type="time"
                {...register('alarm_time', { required: 'Time is required' })}
                className="input-field"
              />
              {errors.alarm_time && <p className="form-error">{errors.alarm_time.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_recurring')}
                className="checkbox"
              />
              <span className="text-dark-300">Recurring alarm</span>
            </label>
          </div>

          {isRecurring && (
            <div className="form-group">
              <label className="form-label">Recurrence Pattern</label>
              <select {...register('recurrence_pattern')} className="input-field">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays only</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_active')}
                className="checkbox"
              />
              <span className="text-dark-300">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-gradient flex-1">
              {isLoading ? 'Creating...' : 'Create Alarm'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}