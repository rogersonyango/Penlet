import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, BookOpen, FileText, Clock, TrendingUp, UserPlus, CheckCircle, ArrowRight } from 'lucide-react';
import { adminAPI, analyticsAPI } from '../../services/api';
import { useAuthStore } from '../../context/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  
  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminAPI.overview().then(res => res.data),
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => analyticsAPI.admin().then(res => res.data),
    enabled: !!user,
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-dark-400">Platform overview and management</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-primary-500/20 to-primary-600/20">
            <Users className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overview?.users?.total || analytics?.total_users || 0}</p>
            <p className="text-sm text-dark-400">Total Users</p>
            <p className="text-xs text-green-400 mt-1">+{analytics?.new_users_this_week || 0} this week</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-accent-500/20 to-accent-600/20">
            <BookOpen className="w-6 h-6 text-accent-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overview?.subjects || analytics?.total_subjects || 0}</p>
            <p className="text-sm text-dark-400">Subjects</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-highlight-500/20 to-highlight-600/20">
            <FileText className="w-6 h-6 text-highlight-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overview?.content?.total || analytics?.total_content || 0}</p>
            <p className="text-sm text-dark-400">Content Items</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-red-500/20 to-red-600/20">
            <Clock className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{overview?.content?.pending || analytics?.pending_approvals || 0}</p>
            <p className="text-sm text-dark-400">Pending Approval</p>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-4">User Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Students</span>
              <span className="text-white font-medium">{overview?.users?.students || analytics?.total_students || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Teachers</span>
              <span className="text-white font-medium">{overview?.users?.teachers || analytics?.total_teachers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Admins</span>
              <span className="text-white font-medium">{overview?.users?.admins || 1}</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link to="/admin/users" className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-colors">
              <UserPlus className="w-5 h-5 text-primary-400" />
              <span className="text-dark-300">Add Teacher</span>
              <ArrowRight className="w-4 h-4 ml-auto text-dark-500" />
            </Link>
            <Link to="/admin/content" className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-colors">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-dark-300">Review Content</span>
              <ArrowRight className="w-4 h-4 ml-auto text-dark-500" />
            </Link>
            <Link to="/admin/subjects" className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/30 hover:bg-dark-700/50 transition-colors">
              <BookOpen className="w-5 h-5 text-accent-400" />
              <span className="text-dark-300">Manage Subjects</span>
              <ArrowRight className="w-4 h-4 ml-auto text-dark-500" />
            </Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Active Today</span>
              <span className="text-white font-medium">{analytics?.active_users_today || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-dark-400">New This Week</span>
              <span className="text-green-400 font-medium">+{analytics?.new_users_this_week || 0}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}