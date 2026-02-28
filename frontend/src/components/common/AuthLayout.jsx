import { Outlet, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { motion } from 'framer-motion';
import {Users} from 'lucide-react'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  
  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600" />
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 lg:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Link to="/" className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <img src="/logo.png" alt="Penlet" />
              </div>
              <span className="text-3xl font-bold text-white">Penlet</span>
            </Link>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Your Gateway to
              <br />
              <span className="text-highlight-400">Academic Excellence</span>
            </h1>
            
            <p className="text-lg text-white/80 mb-8 max-w-md">
              Access comprehensive learning resources designed specifically for Uganda's Senior 1-6 curriculum.
            </p>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 text-white">
                <Users size={20} strokeWidth={2} />
              </div>
              <p className="text-white/80 text-sm">
                <span className="font-semibold text-white">10,000+</span> students already learning
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <img src="/logo.png" alt="Penlet" />
              </div>
              <span className="text-2xl font-bold text-white">Penlet</span>
            </Link>
          </div>
          
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
