import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });
  
  const onSubmit = async (data) => {
    const result = await login(data.username, data.password);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
        Welcome Back
      </h2>
      <p className="text-dark-400 mb-8">
        Sign in to continue your learning journey
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="form-group">
          <label className="form-label">Username or Email</label>
          <input
            type="text"
            {...register('username')}
            className="input-field"
            placeholder="Enter your username or email"
            autoComplete="username"
          />
          {errors.username && (
            <p className="form-error">{errors.username.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="input-field pr-12"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="checkbox" />
            <span className="text-dark-300">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-primary-400 hover:text-primary-300">
            Forgot password?
          </Link>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="btn-gradient w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign In
            </>
          )}
        </button>
      </form>
      
      <div className="mt-8 text-center">
        <p className="text-dark-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
</div>
  );
}
