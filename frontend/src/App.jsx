import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/authStore';

// Layouts
import AuthLayout from './components/common/AuthLayout';
import DashboardLayout from './components/common/DashboardLayout';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import StudentSubjects from './pages/student/Subjects';
import StudentNotes from './pages/student/Notes';
import StudentTimetable from './pages/student/Timetable';
import StudentAssignments from './pages/student/Assignments';
import StudentVideos from './pages/student/Videos';
import StudentFlashcards from './pages/student/Flashcards';
import StudentGames from './pages/student/Games';
import StudentAlarms from './pages/student/Alarms';
import StudentChat from './pages/student/Chat';
import StudentProfile from './pages/student/Profile';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherSubjects from './pages/teacher/Subjects';
import TeacherContent from './pages/teacher/Content';
import TeacherStudents from './pages/teacher/Students';
import TeacherGrading from './pages/teacher/Grading';
import TeacherProfile from './pages/teacher/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminSubjects from './pages/admin/Subjects';
import AdminContent from './pages/admin/Content';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSettings from './pages/admin/Settings';
import AdminProfile from './pages/admin/Profile';

//email verification
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-transparent flex items-center justify-center animate-pulse">
          <img src="/logo.png" alt="Penlet" />
        </div>
        <div className="w-8 h-8 border-2 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isInitialized } = useAuthStore();
  
  // Show loading while auth is initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  const userRole = user?.role?.toLowerCase();
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={`/${userRole}`} replace />;
  }
  
  return children;
}

// Role-based redirect
function RoleRedirect() {
  const { user, isInitialized } = useAuthStore();
  
  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  if (!user) return <Navigate to="/login" replace />;
  
  const role = user.role?.toLowerCase();
  
  switch (role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'teacher':
      return <Navigate to="/teacher" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default function App() {
  const { initialize, isInitialized } = useAuthStore();
  
  // Initialize auth on app startup
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Show loading screen while initializing
  if (!isInitialized) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      
      {/* Role-based redirect */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <RoleRedirect />
        </ProtectedRoute>
      } />

      {/*email verification*/}
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Student Routes */}
      <Route path="/student" element={
        <ProtectedRoute allowedRoles={['student']}>
          <DashboardLayout role="student" />
        </ProtectedRoute>
      }>
        <Route index element={<StudentDashboard />} />
        <Route path="subjects" element={<StudentSubjects />} />
        <Route path="notes" element={<StudentNotes />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="videos" element={<StudentVideos />} />
        <Route path="flashcards" element={<StudentFlashcards />} />
        <Route path="games" element={<StudentGames />} />
        <Route path="alarms" element={<StudentAlarms />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>
      
      {/* Teacher Routes */}
      <Route path="/teacher" element={
        <ProtectedRoute allowedRoles={['teacher', 'admin']}>
          <DashboardLayout role="teacher" />
        </ProtectedRoute>
      }>
        <Route index element={<TeacherDashboard />} />
        <Route path="subjects" element={<TeacherSubjects />} />
        <Route path="content" element={<TeacherContent />} />
        <Route path="students" element={<TeacherStudents />} />
        <Route path="grading" element={<TeacherGrading />} />
        <Route path="profile" element={<TeacherProfile />} />
      </Route>
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout role="admin" />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="content" element={<AdminContent />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}