import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); // Added error state
  const [formData, setFormData] = useState({ email: '', password: '' });

  // The password regex you provided
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleChange = (e) => {
    setError(''); // Clear errors when user types
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Frontend Regex Validation
    if (!passwordRegex.test(formData.password)) {
      setError("Password must have at least 8 characters, one uppercase, one lowercase, one digit, and one special character.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 2. Send credentials to your backend
      const response = await axios.post(`${API_BASE}/login`, formData);

      // On success (Backend sends OTP according to your server code)
      alert(`OTP sent successfully! Welcome back.`);
      
      // 3. Redirect to your OTP verification page or Dashboard
      navigate('/verify-otp', {state: {email: formData.email}}); 

    } catch (error) {
      // Handle 401 (Incorrect Password), 404 (Not Found), or 500
      const message = error.response?.data?.message || "Invalid email or password";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full relative">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 mb-4">
              <Lock className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
            <p className="text-gray-500 mt-2 text-sm">Please enter your details to sign in</p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl text-center font-medium animate-pulse">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="name@company.com"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 ml-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                  Forgot?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  required
                  className={`block w-full pl-10 pr-12 py-3 bg-white border ${error ? 'border-red-200' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm`}
                  placeholder="••••••••"
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full group relative flex items-center justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Authenticating..." : "Sign In"}
              {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:underline decoration-2 underline-offset-4">
              Create one for free
            </Link>
          </p>
        </div>

        <div className="absolute -z-10 top-1/4 left-1/4 w-64 h-64 bg-indigo-300/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -z-10 bottom-1/4 right-1/4 w-64 h-64 bg-teal-200/30 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>
    </div>
  );
};

export default LoginPage;