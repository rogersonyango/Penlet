import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { authAPI } from '../services/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  
  const token = searchParams.get('token');
  
  // Prevent double execution in React Strict Mode
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    // Prevent double verification in Strict Mode
    if (hasVerified.current) {
      return;
    }
    hasVerified.current = true;

    const verifyEmail = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.data?.message || 'Your email has been verified successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } catch (error) {
        // Check if error is because token was already used (which means verification succeeded)
        const errorMessage = error.response?.data?.detail || '';
        
        // If already verified, treat as success
        if (errorMessage.toLowerCase().includes('already verified') || 
            errorMessage.toLowerCase().includes('already been verified') ||
            errorMessage.toLowerCase().includes('invalid') && hasVerified.current) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(errorMessage || 'Verification failed. The link may be invalid or expired.');
        }
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-dark-800 rounded-2xl shadow-lg border border-dark-700 p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verifying Email</h1>
              <p className="text-dark-300">Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-dark-300 mb-6">{message}</p>
              <p className="text-sm text-dark-400">Redirecting to login...</p>
              <Link to="/login" className="btn-gradient inline-block mt-4">
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-dark-300 mb-6">{message}</p>
              <div className="space-y-3">
                <Link to="/resend-verification" className="btn-gradient w-full flex items-center justify-center gap-2">
                  <Mail className="w-5 h-5" />
                  Resend Verification Email
                </Link>
                <Link to="/login" className="btn-secondary w-full inline-block">
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}