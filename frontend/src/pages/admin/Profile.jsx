import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Save, Shield, Clock } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { usersAPI, authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminProfile() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword, watch } = useForm();

  const updateProfileMutation = useMutation({
    mutationFn: (data) => usersAPI.update(data),
    onSuccess: (response) => {
      setUser(response.data);
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries(['user']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => usersAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      resetPassword();
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    },
  });

  const onSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    changePasswordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Profile</h1>
        <p className="text-dark-400">Manage your account settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dashboard-card md:col-span-1 text-center"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <h2 className="text-xl font-semibold text-white">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="text-dark-400 text-sm mt-1">{user?.email}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="badge bg-red-500/20 text-red-300">
              <Shield className="w-3 h-3 mr-1" />
              Administrator
            </span>
          </div>
          
          <div className="mt-6 pt-6 border-t border-dark-700 space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-dark-500" />
              <span className="text-dark-300">{user?.email}</span>
            </div>
            {user?.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-dark-500" />
                <span className="text-dark-300">{user?.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-dark-500" />
              <span className="text-dark-300">
                Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="dashboard-card md:col-span-2"
        >
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Edit Profile
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  {...register('first_name', { required: 'First name is required' })}
                  className="input-field"
                />
                {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  {...register('last_name', { required: 'Last name is required' })}
                  className="input-field"
                />
                {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="input-field"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                {...register('phone')}
                className="input-field"
                placeholder="+256 700 000000"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={!isDirty || updateProfileMutation.isPending}
                className="btn-gradient flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Password Change Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="dashboard-card"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary-400" />
            Security
          </h3>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="btn-secondary text-sm"
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                {...registerPassword('current_password', { required: 'Current password is required' })}
                className="input-field"
              />
              {passwordErrors.current_password && (
                <p className="form-error">{passwordErrors.current_password.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                {...registerPassword('new_password', {
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
                className="input-field"
              />
              {passwordErrors.new_password && (
                <p className="form-error">{passwordErrors.new_password.message}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                {...registerPassword('confirm_password', {
                  required: 'Please confirm your password',
                  validate: (value) => value === watch('new_password') || 'Passwords do not match',
                })}
                className="input-field"
              />
              {passwordErrors.confirm_password && (
                <p className="form-error">{passwordErrors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="btn-gradient"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        ) : (
          <p className="text-dark-400 text-sm">
            It's recommended to use a strong password that you don't use elsewhere.
          </p>
        )}
      </motion.div>
    </div>
  );
}