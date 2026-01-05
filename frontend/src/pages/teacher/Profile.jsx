import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Camera, Save, Lock, Loader2, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';

export default function TeacherProfile() {
  const { user, updateProfile, changePassword, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [changingPassword, setChangingPassword] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      first_name: user?.first_name,
      last_name: user?.last_name,
      phone: user?.phone || '',
    },
  });

  const { register: registerPwd, handleSubmit: handlePwdSubmit, reset: resetPwd } = useForm();

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
    setChangingPassword(true);
    const result = await changePassword(data.current_password, data.new_password);
    setChangingPassword(false);
    if (result.success) {
      toast.success('Password changed successfully');
      resetPwd();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-dark-400">Manage your account</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('profile')} className={`tab ${activeTab === 'profile' ? 'active' : ''}`}>
          Profile
        </button>
        <button onClick={() => setActiveTab('security')} className={`tab ${activeTab === 'security' ? 'active' : ''}`}>
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 hover:text-white">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{user?.first_name} {user?.last_name}</h2>
              <p className="text-dark-400">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-primary flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Teacher
                </span>
              </div>
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
          <form onSubmit={handlePwdSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" {...registerPwd('current_password', { required: true })} className="input-field" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" {...registerPwd('new_password', { required: true, minLength: 8 })} className="input-field" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" {...registerPwd('confirm_password', { required: true })} className="input-field" />
            </div>
            <button type="submit" disabled={changingPassword} className="btn-gradient flex items-center gap-2">
              {changingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              Update Password
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}