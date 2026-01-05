import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, ClipboardList, Trophy, Flame, Clock, TrendingUp, Play, FileText, Gamepad2, ArrowRight, Calendar } from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { analyticsAPI, contentAPI } from '../../services/api';

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
    <div className={`stat-icon bg-gradient-to-br ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-dark-400">{label}</p>
      {trend && <p className="text-xs text-green-400 flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3" /> {trend}</p>}
    </div>
  </motion.div>
);

const QuickAction = ({ icon: Icon, label, to, color }) => (
  <Link to={to} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-800/50 border border-dark-700/50 hover:border-primary-500/30 hover:bg-dark-800 transition-all group">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <span className="text-sm text-dark-300 group-hover:text-white transition-colors">{label}</span>
  </Link>
);

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { data: analytics, isLoading: analyticsLoading } = useQuery({ 
    queryKey: ['student-analytics'], 
    queryFn: () => analyticsAPI.student().then(res => res.data),
    enabled: !!user,
    staleTime: 30000, // Cache for 30 seconds
  });
  const { data: upcomingAssignments, isLoading: assignmentsLoading } = useQuery({ 
    queryKey: ['upcoming-assignments'], 
    queryFn: () => contentAPI.upcomingAssignments().then(res => res.data),
    enabled: !!user,
    staleTime: 30000,
  });
  
  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  
  return (
    <div className="space-y-8">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl font-bold text-white">
          {getGreeting()}, {user?.first_name}! 👋
        </motion.h1>
        <p className="text-dark-400 mt-1">Here's an overview of your learning progress</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Assignments" value={analytics?.completed_assignments || 0} color="from-primary-500/20 to-primary-600/20" trend={`${analytics?.pending_assignments || 0} pending`} />
        <StatCard icon={Trophy} label="Game Score" value={analytics?.total_game_score || 0} color="from-highlight-500/20 to-highlight-600/20" />
        <StatCard icon={Flame} label="Games Played" value={analytics?.games_played || 0} color="from-red-500/20 to-red-600/20" />
        <StatCard icon={BookOpen} label="Flashcards" value={analytics?.flashcards_created || 0} color="from-accent-500/20 to-accent-600/20" />
      </div>
      
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          <QuickAction icon={FileText} label="Notes" to="/student/notes" color="bg-primary-500" />
          <QuickAction icon={Play} label="Videos" to="/student/videos" color="bg-red-500" />
          <QuickAction icon={ClipboardList} label="Tasks" to="/student/assignments" color="bg-accent-500" />
          <QuickAction icon={Gamepad2} label="Games" to="/student/games" color="bg-highlight-500" />
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary-400" />Upcoming Assignments</h2>
            <Link to="/student/assignments" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          {upcomingAssignments?.length > 0 ? (
            <div className="space-y-3">
              {upcomingAssignments.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/30 hover:bg-dark-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0"><ClipboardList className="w-5 h-5 text-primary-400" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{a.title}</p><p className="text-xs text-dark-400">{a.subject?.name}</p></div>
                  <div className="text-right"><div className="flex items-center gap-1 text-xs text-highlight-400"><Clock className="w-3 h-3" />{new Date(a.due_date).toLocaleDateString()}</div></div>
                </div>
              ))}
            </div>
          ) : (<div className="text-center py-8"><ClipboardList className="w-12 h-12 text-dark-600 mx-auto mb-3" /><p className="text-dark-400">No upcoming assignments</p></div>)}
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-accent-400" />Today's Schedule</h2>
            <Link to="/student/timetable" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></Link>
          </div>
          <div className="text-center py-8"><Calendar className="w-12 h-12 text-dark-600 mx-auto mb-3" /><p className="text-dark-400">No classes scheduled for today</p><Link to="/student/timetable" className="text-sm text-primary-400 hover:text-primary-300 mt-2 inline-block">Set up your timetable</Link></div>
        </motion.div>
      </div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card">
        <h2 className="text-lg font-semibold text-white mb-4">Learning Progress</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-dark-400">Assignments Completed</span><span className="text-sm font-medium text-white">{analytics?.completed_assignments || 0}/{analytics?.total_assignments || 0}</span></div>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${analytics?.total_assignments ? (analytics.completed_assignments / analytics.total_assignments) * 100 : 0}%` }} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-dark-400">Average Score</span><span className="text-sm font-medium text-white">{analytics?.average_score ? `${analytics.average_score}%` : 'N/A'}</span></div>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${analytics?.average_score || 0}%` }} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-sm text-dark-400">Flashcards Reviewed</span><span className="text-sm font-medium text-white">{analytics?.flashcards_reviewed || 0}</span></div>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.min((analytics?.flashcards_reviewed || 0), 100)}%` }} /></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}