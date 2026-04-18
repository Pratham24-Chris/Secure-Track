import React, { useState, useEffect } from 'react';
import LiveClock from '../common/LiveClock';
import { Sun, Moon, ShieldCheck, LogOut } from 'lucide-react';
import axios from 'axios';
import API_BASE from '../../config/api';

const Navbar = ({ title = "Patient Portal", user, onLogout }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try { await axios.post(`${API_BASE}/logout`); } catch (_) {}
    localStorage.removeItem("user");
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = "/login";
    }
  };

  const currentUser = user || JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <nav className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-slate-800 w-full transition-colors duration-300 shadow-sm z-30">
      
      {/* Left Section: Logo & Title */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          {/* Logo Icon */}
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md">
            <ShieldCheck size={26} />
          </div>
          {/* Brand Name */}
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-blue-900 dark:text-blue-200 tracking-tight text-sm uppercase">Secure</span>
            <span className="font-extrabold text-blue-900 dark:text-blue-200 tracking-tight text-sm uppercase">Track</span>
          </div>
        </div>
        
        {/* Divider */}
        <div className="hidden md:block h-8 border-l-2 border-gray-300 dark:border-slate-700"></div>
        
        {/* Page Title */}
        <h1 className="hidden md:block text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
      </div>

      {/* Right Section: Theme Toggle, User Info, Clock & Logout */}
      <div className="flex items-center space-x-3 md:space-x-6">
        
        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-gray-700" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-400" />
          )}
        </button>

        {/* User Info & Status */}
        <div className="hidden md:flex flex-col items-end space-y-1">
          <LiveClock/>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">System Status:</span>
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 font-bold px-2 py-0.5 rounded-sm">
              ACTIVE
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-sm font-extrabold text-gray-900 dark:text-white uppercase leading-tight tracking-wide max-w-[80px] md:max-w-none truncate">
              {currentUser?.name || "User"}
            </span>
            <span className="hidden md:block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase leading-tight">
              {currentUser?.role || "Member"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-xs shadow-sm">
            {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>

      </div>

    </nav>
  );
};

export default Navbar;