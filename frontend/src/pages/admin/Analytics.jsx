import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, Users, TrendingUp, Activity, Award, BookOpen } from 'lucide-react';
import { analyticsAPI } from '../../services/api';

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => analyticsAPI.admin().then(res => res.data),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['student-leaderboard'],
    queryFn: () => analyticsAPI.leaderboard({ limit: 10 }).then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded-lg" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="skeleton h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
        <p className="text-dark-400">Overview of platform performance and usage</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-primary-500/20 to-primary-600/20">
            <Users className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.total_users || 0}</p>
            <p className="text-sm text-dark-400">Total Users</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-green-500/20 to-green-600/20">
            <Activity className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.active_users_today || 0}</p>
            <p className="text-sm text-dark-400">Active Today</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-accent-500/20 to-accent-600/20">
            <TrendingUp className="w-6 h-6 text-accent-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">+{analytics?.new_users_this_week || 0}</p>
            <p className="text-sm text-dark-400">New This Week</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-highlight-500/20 to-highlight-600/20">
            <BookOpen className="w-6 h-6 text-highlight-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.total_content || 0}</p>
            <p className="text-sm text-dark-400">Content Items</p>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            User Distribution
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-dark-400">Students</span>
                <span className="text-white font-medium">{analytics?.total_students || 0}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${analytics?.total_users ? (analytics.total_students / analytics.total_users) * 100 : 0}%` }} 
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-dark-400">Teachers</span>
                <span className="text-white font-medium">{analytics?.total_teachers || 0}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill bg-gradient-to-r from-accent-500 to-accent-400" 
                  style={{ width: `${analytics?.total_users ? (analytics.total_teachers / analytics.total_users) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-highlight-400" />
            Top Students (Game Scores)
          </h2>
          {leaderboard?.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.slice(0, 5).map((student, i) => (
                <div key={student.id} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-highlight-500 text-dark-900' :
                    i === 1 ? 'bg-dark-400 text-dark-900' :
                    i === 2 ? 'bg-orange-600 text-white' :
                    'bg-dark-700 text-dark-300'
                  }`}>
                    {student.rank}
                  </span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-dark-500">{student.class}</p>
                  </div>
                  <span className="text-highlight-400 font-semibold">{student.total_score}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-400 text-center py-4">No data available</p>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card">
        <h2 className="text-lg font-semibold text-white mb-4">Content Statistics</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-dark-700/30 text-center">
            <p className="text-3xl font-bold text-gradient">{analytics?.total_subjects || 0}</p>
            <p className="text-sm text-dark-400">Subjects</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-700/30 text-center">
            <p className="text-3xl font-bold text-gradient">{analytics?.total_content || 0}</p>
            <p className="text-sm text-dark-400">Total Content</p>
          </div>
          <div className="p-4 rounded-xl bg-dark-700/30 text-center">
            <p className="text-3xl font-bold text-gradient">{analytics?.pending_approvals || 0}</p>
            <p className="text-sm text-dark-400">Pending Approval</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}