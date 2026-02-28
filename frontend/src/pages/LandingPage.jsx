import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, Users, GraduationCap, Play, Brain, Calendar,
  CheckCircle, ArrowRight, Sparkles, Shield, Zap,
  MessageCircle, X, Send, Loader2, Gamepad, TrendingUp, Video,
  Presentation
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';

// EmailJS Configuration (from environment variables)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const features = [
  { icon: BookOpen, title: 'Digital Notes', desc: 'Access PDF notes organized by subject, anytime' },
  { icon: Video, title: 'Educational Videos', desc: 'Watch curriculum-aligned video lessons' },
  { icon: Brain, title: 'AI Study Assistant', desc: 'Get help from our intelligent chatbot' },
  { icon: Calendar, title: 'Smart Timetable', desc: 'Organize your study schedule effectively' },
  { icon: Gamepad, title: 'Learning Games', desc: 'Make studying fun with educational games' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Monitor your academic performance' },
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
    try {
      const templateParams = {
        name: data.name,
        email: data.email,
        phone: data.phone || 'Not provided',
        user_type: userTypes.find(t => t.value === data.userType)?.label || data.userType,
        subject: data.subject,
        message: data.message,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      toast.success('Your inquiry has been sent! We\'ll get back to you soon.');
      reset();
      setShowContactForm(false);
    } catch (error) {
      console.error('EmailJS error:', error);
      toast.error('Failed to send inquiry. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center">
                <img src="/logo.png" alt="Penlet" />
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

      {/* Hero Section with Background Image */}
      <section className="relative pt-16 min-h-screen flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-bg.jpg" 
            alt="Students learning" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-900/95 via-dark-900/80 to-dark-900/60" />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 mb-6">
                <Zap className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-white font-medium">Uganda's Modern Education Platform</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Transform Your</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent-400">Learning Journey</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-dark-200 mb-8 max-w-xl">
                A comprehensive educational platform designed for Uganda's Senior 1-6 curriculum. 
                Access notes, videos, assignments, and interactive learning tools.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn-gradient flex items-center gap-2 justify-center">
                  <GraduationCap className="w-5 h-5" />
                  Start Learning
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mt-12">
                {stats.map((stat, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-dark-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-dark-900">
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
            <p className="text-dark-300 max-w-2xl mx-auto">
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
                className="bg-dark-800 border border-dark-700 rounded-2xl p-6 hover:border-primary-500/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-dark-300 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About/Showcase Section with Image */}
      <section className="py-20 px-4 bg-dark-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Side */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden shadow-xl border border-dark-700">
                <img 
                  src="/images/students-learning.jpg" 
                  alt="Students learning together" 
                  className="w-full h-[400px] object-cover"
                />
              </div>
              {/* Decorative Element */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl -z-10" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-primary-500/30 rounded-xl -z-10" />
            </motion.div>

            {/* Content Side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                Why Choose Penlet
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Empowering Uganda's Next Generation
              </h2>
              <p className="text-dark-300 mb-6">
                Penlet is designed specifically for Uganda's education system, covering Senior 1 through Senior 6 
                curriculum. Our platform bridges the gap between traditional classroom learning and modern 
                digital education.
              </p>
              <ul className="space-y-4">
                {[
                  'Aligned with Uganda National Curriculum',
                  'Accessible on any device, anywhere',
                  'Interactive learning experiences',
                  'Real-time progress tracking',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-primary-400" />
                    </div>
                    <span className="text-dark-200">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-dark-900">
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
            <p className="text-dark-300">Three distinct experiences tailored to each user type</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: GraduationCap,
                title: 'Students',
                image: '/images/student-role.jpg',
                iconBg: 'bg-primary-500/20',
                iconColor: 'text-primary-400',
                features: ['Access notes & videos', 'Submit assignments', 'Play learning games', 'Track progress'],
              },
              {
                icon: Presentation,
                title: 'Teachers',
                image: '/images/teacher-role.jpg',
                iconBg: 'bg-accent-500/20',
                iconColor: 'text-accent-400',
                features: ['Upload content', 'Create assignments', 'Grade submissions', 'Monitor students'],
              },
              {
                icon: Shield,
                title: 'Administrators',
                image: '/images/admin-role.jpg',
                iconBg: 'bg-amber-500/20',
                iconColor: 'text-amber-400',
                features: ['Manage users', 'Approve content', 'View analytics', 'System settings'],
              },
            ].map((role, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-700 hover:border-primary-500/50 transition-colors"
              >
                {/* Role Image */}
                <div className="h-48 overflow-hidden">
                  <img 
                    src={role.image} 
                    alt={role.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${role.iconBg} flex items-center justify-center mb-4 -mt-12 relative z-10 border-4 border-dark-800 shadow-lg`}>
                    <role.icon className={`w-6 h-6 ${role.iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4">{role.title}</h3>
                  <ul className="space-y-2">
                    {role.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-dark-300 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial/Quote Section */}
      <section className="py-20 px-4 bg-dark-800/50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">"</span>
            </div>
            <blockquote className="text-2xl sm:text-3xl font-medium text-white mb-6">
              Education is the most powerful weapon which you can use to change the world.
            </blockquote>
            <cite className="text-dark-400">— Nelson Mandela</cite>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/cta-bg.jpg" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-accent-600/90" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Start Learning?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of students across Uganda who are already using Penlet to excel in their studies.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-dark-900 border-t border-dark-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-transparent flex items-center justify-center">
                <img src="/logo.png" alt="Penlet" />
              </div>
              <span className="text-white font-semibold">Penlet</span>
            </div>
            <p className="text-dark-400 text-sm">
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
                  <label className="block text-sm font-medium text-dark-200 mb-2">
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
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
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
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Phone Number <span className="text-dark-400">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="e.g., +256 700 000000"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Subject <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('subject', { required: 'Subject is required' })}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="What is your inquiry about?"
                  />
                  {errors.subject && (
                    <p className="text-red-400 text-sm mt-1">{errors.subject.message}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-2">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    {...register('message', { 
                      required: 'Message is required',
                      minLength: { value: 10, message: 'Message must be at least 10 characters' }
                    })}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-primary-500 transition-colors resize-none"
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