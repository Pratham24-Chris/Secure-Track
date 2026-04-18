import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User, Briefcase, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config/api';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(''); // State for validation errors
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    role: ''
  });

  // Password Regex requirement
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(''); // Clear error when user types
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Frontend Validation
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be 8+ chars with uppercase, lowercase, number, and special char.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE}/register`, formData);
      console.log("Data sent Successfully:", response.data);
      navigate("/login");
    } catch (error) {
      // 2. Handle Backend Error (like the 401 you were getting)
      const backendMsg = error.response?.data?.message || "Submission Failed";
      setError(backendMsg);
      console.log("Submission Failed: ", backendMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 py-8 transition-colors duration-300">
      <div className="max-w-md w-full relative">
        <div className="absolute -z-10 -top-10 -left-10 w-64 h-64 bg-indigo-200/50 dark:bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -z-10 -bottom-10 -right-10 w-64 h-64 bg-teal-100/50 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>

        <div className="premium-card backdrop-blur-xl transition-all duration-300">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 mb-4">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Create Account</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm transition-colors">Join the professional network</p>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg animate-shake">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="John Doe"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="john@company.com"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Employee ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Briefcase size={18} />
                </div>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  required
                  className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="EMP-1234"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Role</label>
              <div className="relative">
                <select
                  name="role"
                  value={formData.role}
                  required
                  className="block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                  onChange={handleChange}
                >
                  <option value="" disabled>Select Role</option>
                  <optgroup label="── Roles ──">
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                    <option value="manager">Manager</option>
                    <option value="designer">Designer</option>
                    <option value="hr">HR</option>
                    <option value="analyst">Analyst</option>
                    <option value="intern">Intern</option>
                  </optgroup>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  required
                  className={`block w-full pl-10 pr-12 py-2.5 bg-white border ${error && formData.password ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm`}
                  placeholder="••••••••"
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full group flex items-center justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-200 mt-4 disabled:opacity-70"
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
              {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-indigo-600 hover:underline decoration-2 underline-offset-4">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;