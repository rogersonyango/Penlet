import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('form'); // form, success, error
  const [passwordErrors, setPasswordErrors] = useState([]);
  
  const token = searchParams.get('token');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const onSubmit = async (data) => {
    if (!token) {
      setStatus('error');
      return;
    }

    setIsSubmitting(true);
    setPasswordErrors([]);
    
    try {
      await authAPI.resetPassword(token, data.password);
      setStatus('success');
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error) {
      const errorData = error.response?.data;
      
      if (errorData?.detail?.password_errors) {
        setPasswordErrors(errorData.detail.password_errors);
        toast.error('Password does not meet requirements');
      } else if (errorData?.detail === 'Invalid or expired reset token') {
        setStatus('error');
        toast.error('Reset link has expired');
      } else {
        toast.error(typeof errorData?.detail === 'string' ? errorData.detail : 'Failed to reset password');
      }
    }
    setIsSubmitting(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="bg-dark-800 rounded-2xl shadow-lg border border-dark-700 p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Link</h1>
          <p className="text-dark-300 mb-6">This password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-gradient inline-block">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-dark-800 rounded-2xl shadow-lg border border-dark-700 p-8">
          {status === 'form' && (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary-500" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                <p className="text-dark-300">Enter your new password below</p>
              </div>

              {/* Password Requirements Info */}
              <div className="mb-6 p-4 bg-dark-700/50 rounded-xl border border-dark-600">
                <p className="text-sm font-medium text-dark-200 mb-2">Password must contain:</p>
                <ul className="text-sm text-dark-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-dark-400 rounded-full"></span>
                    At least 8 characters
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-dark-400 rounded-full"></span>
                    One uppercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-dark-400 rounded-full"></span>
                    One lowercase letter
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-dark-400 rounded-full"></span>
                    One number
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-dark-400 rounded-full"></span>
                    One special character (!@#$%^&*)
                  </li>
                </ul>
              </div>

              {/* Password Validation Errors from Backend */}
              {passwordErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400 mb-1">Password requirements not met:</p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {passwordErrors.map((err, index) => (
                          <li key={index}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Password must be at least 8 characters' }
                      })}
                      className="input-field pr-12"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: value => value === password || 'Passwords do not match'
                      })}
                      className="input-field pr-12"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gradient w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Reset Password</>
                  )}
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
              <p className="text-dark-300 mb-6">Your password has been successfully reset.</p>
              <p className="text-sm text-dark-400 mb-4">Redirecting to login...</p>
              <Link to="/login" className="btn-gradient inline-block">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Reset Failed</h1>
              <p className="text-dark-300 mb-6">The reset link may be invalid or expired.</p>
              <Link to="/forgot-password" className="btn-gradient inline-block">
                Request New Link
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}