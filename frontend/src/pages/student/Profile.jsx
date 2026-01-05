import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Camera, Save, Lock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const { register, handleSubmit } = useForm({
    defaultValues: {
      first_name: user?.first_name,
      last_name: user?.last_name,
      phone: user?.phone || '',
    },
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword, formState: { errors: passwordErrors } } = useForm();

  const onProfileSubmit = async (data) => {
    const result = await updateProfile(data);
    if (result.success) toast.success('Profile updated!');
    else toast.error(result.error);
  };

  const onPasswordSubmit = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    const result = await changePassword({
      current_password: data.current_password,
      new_password: data.new_password,
    });
    if (result.success) {
      toast.success('Password changed successfully!');
      resetPassword();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-dark-400">Manage your account information</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('profile')} className={`tab ${activeTab === 'profile' ? 'active' : ''}`}>Profile</button>
        <button onClick={() => setActiveTab('security')} className={`tab ${activeTab === 'security' ? 'active' : ''}`}>Security</button>
      </div>

      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.first_name} {user?.last_name}</h2>
              <p className="text-dark-400">{user?.email}</p>
              <span className="badge badge-primary mt-2">{user?.student_class}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input {...register('first_name')} className="input-field" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input {...register('last_name')} className="input-field" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" value={user?.email} disabled className="input-field opacity-50" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input {...register('phone')} className="input-field" placeholder="+256..." />
            </div>
            <button type="submit" disabled={isLoading} className="btn-gradient flex items-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Changes
            </button>
          </form>
        </motion.div>
      )}

      {activeTab === 'security' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Change Password
          </h3>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input 
                type="password" 
                {...registerPassword('current_password', { required: 'Current password is required' })}
                className="input-field" 
              />
              {passwordErrors.current_password && <p className="form-error">{passwordErrors.current_password.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                {...registerPassword('new_password', { 
                  required: 'New password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                })}
                className="input-field" 
              />
              {passwordErrors.new_password && <p className="form-error">{passwordErrors.new_password.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                {...registerPassword('confirm_password', { required: 'Please confirm your password' })}
                className="input-field" 
              />
              {passwordErrors.confirm_password && <p className="form-error">{passwordErrors.confirm_password.message}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="btn-gradient flex items-center gap-2">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Update Password
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}