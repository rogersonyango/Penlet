import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, BookOpen, FileText, Calendar, ClipboardList, Video,
  Layers, Gamepad2, Bell, MessageCircle, User, LogOut, Menu, X,
  Users, BarChart3, Settings, CheckCircle, Upload, GraduationCap, Loader2
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
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
  
  // Ensure user data is loaded before rendering dashboard content
  useEffect(() => {
    const initializeDashboard = async () => {
      // If user is not loaded yet, try to refresh from server
      if (!user && !isLoading) {
        const result = await refreshUser();
        if (!result.success) {
          // If refresh fails, redirect to login
          navigate('/login');
          return;
        }
      }
      // Small delay to ensure state is fully propagated
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
      case 'admin': return 'bg-red-500/20 text-red-300';
      case 'teacher': return 'bg-accent-500/20 text-accent-300';
      default: return 'bg-primary-500/20 text-primary-300';
    }
  };
  
  // Show loading state while initializing
  if (!isReady || !user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-dark-800/50 border-r border-dark-700/50">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-dark-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-white">Penlet</span>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}`}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>
        
        {/* User info */}
        <div className="p-4 border-t border-dark-700/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-semibold">
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
      </aside>
      
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-y-0 left-0 w-72 bg-dark-800 border-r border-dark-700 z-50 lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-dark-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                  <span className="text-lg font-bold text-white">Penlet</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-dark-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <nav className="py-4 px-3">
                {navigation.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === `/${role}`}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      
      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-dark-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2 lg:gap-4">
              <span className={`badge ${getRoleBadgeColor()} capitalize`}>
                <GraduationCap className="w-3 h-3 mr-1" />
                {role}
              </span>
              {user?.student_class && (
                <span className="badge badge-primary">{user.student_class}</span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 text-dark-400 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="notification-dot" />
              </button>
              
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                </button>
                
                <AnimatePresence>
                  {profileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="dropdown-menu open"
                      >
                        <div className="px-4 py-3 border-b border-dark-700">
                          <p className="text-sm font-medium text-white">
                            {user?.first_name} {user?.last_name}
                          </p>
                          <p className="text-xs text-dark-400">{user?.email}</p>
                        </div>
                        <NavLink
                          to={`/${role}/profile`}
                          onClick={() => setProfileMenuOpen(false)}
                          className="dropdown-item"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </NavLink>
                        <button onClick={handleLogout} className="dropdown-item w-full text-red-400">
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}