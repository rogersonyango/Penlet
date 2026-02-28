import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BookOpen, FileText, Calendar, ClipboardList, Video,
  Layers, Gamepad2, Bell, MessageCircle, User, LogOut, Menu, X,
  Users, BarChart3, Settings, CheckCircle, Upload, GraduationCap, Loader2
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import NotificationBell from '../../components/NotificationBell';
import AlarmPopup from '../../components/AlarmPopup';
import toast from 'react-hot-toast';

const NAVIGATION = {
  student: [
    { name: 'Dashboard', path: '/student', icon: Home },
    { name: 'Subjects', path: '/student/subjects', icon: BookOpen },
    { name: 'Notes', path: '/student/notes', icon: FileText },
    { name: 'Timetable', path: '/student/timetable', icon: Calendar },
    { name: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { name: 'Videos', path: '/student/videos', icon: Video },
    { name: 'Flashcards', path: '/student/flashcards', icon: Layers },
    { name: 'Games', path: '/student/games', icon: Gamepad2 },
    { name: 'Alarms', path: '/student/alarms', icon: Bell },
    { name: 'AI Chat', path: '/student/chat', icon: MessageCircle },
    { name: 'Profile', path: '/student/profile', icon: User },
  ],
  teacher: [
    { name: 'Dashboard', path: '/teacher', icon: Home },
    { name: 'My Subjects', path: '/teacher/subjects', icon: BookOpen },
    { name: 'Content', path: '/teacher/content', icon: Upload },
    { name: 'Students', path: '/teacher/students', icon: Users },
    { name: 'Grading', path: '/teacher/grading', icon: CheckCircle },
    { name: 'Profile', path: '/teacher/profile', icon: User },
  ],
  admin: [
    { name: 'Dashboard', path: '/admin', icon: Home },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
    { name: 'Content', path: '/admin/content', icon: FileText },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
    { name: 'Profile', path: '/admin/profile', icon: User },
  ],
};

export default function DashboardLayout({ role }) {
  const navigate = useNavigate();
  const { user, logout, isLoading, refreshUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const navigation = NAVIGATION[role] || NAVIGATION.student;
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Delay the request to not be intrusive
      setTimeout(() => {
        Notification.requestPermission();
      }, 5000);
    }
  }, []);
  
  // Ensure user data is loaded before rendering dashboard content
  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user && !isLoading) {
        const result = await refreshUser();
        if (!result.success) {
          navigate('/login');
          return;
        }
      }
      setTimeout(() => setIsReady(true), 100);
    };
    
    initializeDashboard();
  }, [user, isLoading, refreshUser, navigate]);
  
  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };
  
  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'teacher': return 'bg-accent-100 text-accent-700';
      default: return 'bg-primary-100 text-primary-700';
    }
  };

  const getClassBadge = () => {
    if (role === 'student' && user?.student_class) {
      const classMap = {
        SENIOR_1: 'S1', SENIOR_2: 'S2', SENIOR_3: 'S3',
        SENIOR_4: 'S4', SENIOR_5: 'S5', SENIOR_6: 'S6',
      };
      return classMap[user.student_class] || user.student_class;
    }
    return null;
  };
  
  // Show loading state while checking auth
  if (isLoading || !isReady) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Alarm Popup - renders when alarms trigger */}
      {role === 'student' && <AlarmPopup />}
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <img src="/logo.png" alt="Penlet" />
              </div>
              <span className="text-xl font-bold text-white">Penlet</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-dark-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}`}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-500/10 text-primary-400 border-l-4 border-primary-500' 
                      : 'text-dark-400 hover:bg-dark-700/50 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-dark-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-dark-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-dark-800/80 backdrop-blur-xl border-b border-dark-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-dark-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Role & Class Badges */}
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
                {getClassBadge() && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-dark-700 text-dark-300">
                    {getClassBadge()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-dark-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-medium">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 py-2 bg-dark-800 border border-dark-700 rounded-xl shadow-xl"
                    >
                      <NavLink
                        to={`/${role}/profile`}
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-dark-300 hover:text-white hover:bg-dark-700"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </NavLink>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-dark-700 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}