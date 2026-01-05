import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Users, GraduationCap, Play, Brain, Calendar,
  CheckCircle, ArrowRight, Sparkles, Shield, Zap,
  MessageCircle, X, Send, Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const features = [
  { icon: BookOpen, title: 'Digital Notes', desc: 'Access PDF notes organized by subject, anytime' },
  { icon: Play, title: 'Educational Videos', desc: 'Watch curriculum-aligned video lessons' },
  { icon: Brain, title: 'AI Study Assistant', desc: 'Get help from our intelligent chatbot' },
  { icon: Calendar, title: 'Smart Timetable', desc: 'Organize your study schedule effectively' },
  { icon: Sparkles, title: 'Learning Games', desc: 'Make studying fun with educational games' },
  { icon: Shield, title: 'Progress Tracking', desc: 'Monitor your academic performance' },
];

const stats = [
  { value: '10K+', label: 'Students' },
  { value: '500+', label: 'Teachers' },
  { value: '1000+', label: 'Resources' },
  { value: 'S1-S6', label: 'Coverage' },
];

const userTypes = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent/Guardian' },
  { value: 'school_admin', label: 'School Administrator' },
  { value: 'other', label: 'Other' },
];

export default function LandingPage() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmitContact = async (data) => {
    setIsSubmitting(true);
    
    // Simulate sending the inquiry (replace with actual API call when email service is set up)
    try {
      // In production, this would send to your backend which would email the inquiry
      // await api.post('/contact', data);
      
      // For now, we'll just simulate a delay and show success
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Contact form submission:', data);
      toast.success('Your inquiry has been sent! We\'ll get back to you soon.');
      reset();
      setShowContactForm(false);
    } catch (error) {
      toast.error('Failed to send inquiry. Please try again.');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="text-xl font-bold text-white">Penlet</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-dark-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="btn-gradient text-sm py-2">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-glow opacity-50" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-6">
              <Zap className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-primary-300">Uganda's Modern Education Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">Transform Your</span>
              <br />
              <span className="text-gradient">Learning Journey</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-dark-300 mb-8 max-w-2xl mx-auto">
              A comprehensive educational platform designed for Uganda's Senior 1-6 curriculum. 
              Access notes, videos, assignments, and interactive learning tools.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-gradient flex items-center gap-2 w-full sm:w-auto justify-center">
                <GraduationCap className="w-5 h-5" />
                Start Learning
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center">
                <Users className="w-5 h-5" />
                I'm a Teacher
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          >
            {stats.map((stat, i) => (
              <div key={i} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                <div className="text-sm text-dark-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              Penlet provides all the tools students and teachers need for effective learning and teaching.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-dark-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Everyone
            </h2>
            <p className="text-dark-400">Three distinct experiences tailored to each user type</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: 'Students',
                color: 'primary',
                features: ['Access notes & videos', 'Submit assignments', 'Play learning games', 'Track progress'],
              },
              {
                icon: Users,
                title: 'Teachers',
                color: 'accent',
                features: ['Upload content', 'Create assignments', 'Grade submissions', 'Monitor students'],
              },
              {
                icon: Shield,
                title: 'Administrators',
                color: 'highlight',
                features: ['Manage users', 'Approve content', 'View analytics', 'System settings'],
              },
            ].map((role, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="glass-card p-8"
              >
                <div className={`w-16 h-16 rounded-2xl bg-${role.color}-500/20 flex items-center justify-center mb-6`}>
                  <role.icon className={`w-8 h-8 text-${role.color}-400`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{role.title}</h3>
                <ul className="space-y-3">
                  {role.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-dark-300">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-dark-400 mb-8 max-w-xl mx-auto">
              Join thousands of students across Uganda who are already using Penlet to excel in their studies.
            </p>
            <Link to="/register" className="btn-gradient inline-flex items-center gap-2">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="text-white font-semibold">Penlet</span>
            </div>
            <p className="text-dark-500 text-sm">
              © 2024 Penlet. Built for Uganda's Education System.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Support Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        onClick={() => setShowContactForm(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center hover:scale-110 transition-transform"
        title="Contact Support"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Contact Form Modal */}
      <AnimatePresence>
        {showContactForm && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowContactForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Contact Support</h2>
                      <p className="text-white/70 text-sm">We're here to help</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowContactForm(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmitContact)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* User Type */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    I am a <span className="text-red-400">*</span>
                  </label>
                  <select
                    {...register('userType', { required: 'Please select your user type' })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select user type...</option>
                    {userTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  {errors.userType && (
                    <p className="text-red-400 text-sm mt-1">{errors.userType.message}</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Phone Number <span className="text-dark-500">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="e.g., +256 700 000000"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('subject', { required: 'Subject is required' })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="What is your inquiry about?"
                  />
                  {errors.subject && (
                    <p className="text-red-400 text-sm mt-1">{errors.subject.message}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    {...register('message', { 
                      required: 'Message is required',
                      minLength: { value: 10, message: 'Message must be at least 10 characters' }
                    })}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                    placeholder="Describe your inquiry or issue in detail..."
                  />
                  {errors.message && (
                    <p className="text-red-400 text-sm mt-1">{errors.message.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="flex-1 px-4 py-3 bg-dark-700 text-dark-300 rounded-xl hover:bg-dark-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Inquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}