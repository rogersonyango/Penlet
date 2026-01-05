import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../context/authStore';

const CLASS_LEVELS = [
  { value: 'S1', label: 'Senior 1' },
  { value: 'S2', label: 'Senior 2' },
  { value: 'S3', label: 'Senior 3' },
  { value: 'S4', label: 'Senior 4' },
  { value: 'S5', label: 'Senior 5' },
  { value: 'S6', label: 'Senior 6' },
];

const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  student_class: z.string().min(1, 'Please select your class'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
    },
  });
  
  const onSubmit = async (data) => {
    const { confirm_password, ...userData } = data;
    userData.role = 'student';
    
    const result = await registerUser(userData);
    
    if (result.success) {
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } else {
      toast.error(result.error);
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
        Create Account
      </h2>
      <p className="text-dark-400 mb-8">
        Join Penlet and start your learning journey
      </p>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              type="text"
              {...register('first_name')}
              className="input-field"
              placeholder="John"
            />
            {errors.first_name && (
              <p className="form-error">{errors.first_name.message}</p>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              type="text"
              {...register('last_name')}
              className="input-field"
              placeholder="Doe"
            />
            {errors.last_name && (
              <p className="form-error">{errors.last_name.message}</p>
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            {...register('username')}
            className="input-field"
            placeholder="johndoe"
          />
          {errors.username && (
            <p className="form-error">{errors.username.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            {...register('email')}
            className="input-field"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Class Level</label>
          <select {...register('student_class')} className="input-field">
            <option value="">Select your class</option>
            {CLASS_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
          {errors.student_class && (
            <p className="form-error">{errors.student_class.message}</p>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="input-field pr-12"
              placeholder="Create a strong password"
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
        
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            type="password"
            {...register('confirm_password')}
            className="input-field"
            placeholder="Confirm your password"
          />
          {errors.confirm_password && (
            <p className="form-error">{errors.confirm_password.message}</p>
          )}
        </div>
        
        <div className="flex items-start gap-2">
          <input type="checkbox" className="checkbox mt-1" required />
          <span className="text-sm text-dark-400">
            I agree to the{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-400 hover:text-primary-300">
              Privacy Policy
            </a>
          </span>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="btn-gradient w-full flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create Account
            </>
          )}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-dark-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
      
      <p className="mt-6 text-xs text-dark-500 text-center">
        Note: Teachers cannot self-register. Please contact your administrator.
      </p>
    </div>
  );
}
