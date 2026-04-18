import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../config/api';

const VerifyOTP = () => {
  const [otp, setOtp] = useState("");
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Allow only numbers
    if (value.length <= 4) {
      setOtp(value);
      setIsError(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length < 4) {
      setIsError(true);
      setErrorMsg("Please enter the 4-digit OTP.");
      return;
    }
    setIsVerifying(true);
    setIsError(false);
    setErrorMsg("");
    try {
      const response = await axios.post(`${API_BASE}/verify-otp`, {
        email: email,
        otp: otp
      });

      // Save user info (name, email, role) to localStorage
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      // Navigate to /dashboard — PrivateRoute will redirect to the correct dashboard by role
      navigate('/dashboard');

    } catch (error) {
      setIsError(true);
      setErrorMsg(error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-[320px] text-center">
        
        {/* Icon */}
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h3 className="text-lg font-bold text-gray-800">Verify Account</h3>
        <p className="text-xs text-gray-500 mt-1 mb-6">Enter the 4-digit code sent to your mail</p>

        {/* Input Container */}
        <div className="relative mb-4">
          <input
            type="text"
            value={otp}
            onChange={handleChange}
            placeholder="0000"
            className={`w-full text-center text-3xl font-mono font-bold tracking-[1em] py-3 rounded-xl border-2 transition-all outline-none 
              ${isError ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-gray-50 focus:border-indigo-500 focus:bg-white'}`}
          />
          {/* Subtle underline markers to guide the user */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-6 pointer-events-none opacity-20">
             {[...Array(4)].map((_, i) => (
               <div key={i} className="w-6 h-0.5 bg-gray-400"></div>
             ))}
          </div>
        </div>

        {/* Error message */}
        {isError && errorMsg && (
          <p className="text-xs text-red-500 mb-3 font-medium">{errorMsg}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-md transition-all active:scale-95"
        >
          {isVerifying ? "Verifying..." : "Verify Code"}
        </button>

        <button
          onClick={() => navigate('/login')}
          className="mt-4 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
        >
          ↩ Didn't receive code? Go back &amp; resend
        </button>
      </div>
    </div>
  );
};

export default VerifyOTP;