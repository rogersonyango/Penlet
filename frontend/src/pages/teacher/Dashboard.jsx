import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckCircle, Clock, Upload, BookOpen, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { analyticsAPI, adminAPI } from '../../services/api';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  
  const { data: analytics } = useQuery({
    queryKey: ['teacher-analytics'],
    queryFn: () => analyticsAPI.teacher().then(res => res.data),
    enabled: !!user,
    staleTime: 30000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">{getGreeting()}, {user?.first_name}!</h1>
        <p className="text-dark-400">Here's your teaching overview</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-primary-500/20 to-primary-600/20">
            <Users className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.total_students || 0}</p>
            <p className="text-sm text-dark-400">Total Students</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-accent-500/20 to-accent-600/20">
            <BookOpen className="w-6 h-6 text-accent-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.subjects_assigned || 0}</p>
            <p className="text-sm text-dark-400">Subjects</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-highlight-500/20 to-highlight-600/20">
            <Clock className="w-6 h-6 text-highlight-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.pending_submissions || 0}</p>
            <p className="text-sm text-dark-400">Pending Review</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <div className="stat-icon bg-gradient-to-br from-green-500/20 to-green-600/20">
            <FileText className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{analytics?.content_uploaded || 0}</p>
            <p className="text-sm text-dark-400">Content Uploaded</p>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-highlight-400" />
              Pending Submissions
            </h2>
            <Link to="/teacher/grading" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {analytics?.pending_submissions > 0 ? (
            <p className="text-dark-300">You have {analytics.pending_submissions} submissions waiting for review</p>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
              <p className="text-dark-400">All caught up! No pending submissions</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-accent-400" />
              Quick Actions
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/teacher/content" className="p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors text-center">
              <FileText className="w-8 h-8 text-primary-400 mx-auto mb-2" />
              <p className="text-sm text-dark-300">Upload Notes</p>
            </Link>
            <Link to="/teacher/content" className="p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors text-center">
              <Upload className="w-8 h-8 text-accent-400 mx-auto mb-2" />
              <p className="text-sm text-dark-300">Add Assignment</p>
            </Link>
            <Link to="/teacher/students" className="p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors text-center">
              <Users className="w-8 h-8 text-highlight-400 mx-auto mb-2" />
              <p className="text-sm text-dark-300">View Students</p>
            </Link>
            <Link to="/teacher/grading" className="p-4 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-dark-300">Grade Work</p>
            </Link>
          </div>
        </motion.div>
      </div>

      {analytics?.average_class_score && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card">
          <h2 className="text-lg font-semibold text-white mb-4">Class Performance</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-400">Average Score</span>
                <span className="text-sm font-medium text-white">{analytics.average_class_score}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${analytics.average_class_score}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}