import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, Sparkles, ShieldCheck, Zap } from 'lucide-react';

const ModernLogin = ({ onLogin, loading }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(formData);
  };

  const features = [
    { icon: ShieldCheck, text: 'Secure & Encrypted', color: 'from-blue-500 to-cyan-500' },
    { icon: Zap, text: 'Lightning Fast', color: 'from-purple-500 to-pink-500' },
    { icon: Sparkles, text: 'Modern Interface', color: 'from-orange-500 to-red-500' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/30 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-purple-400/30 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 flex items-center justify-center gap-12">
        {/* Left Side - Branding & Features */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col gap-8 flex-1"
        >
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl font-black text-white mb-4"
            >
              Spiraldart
              <span className="block text-5xl bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                TMS
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 font-light"
            >
              Professional Tenant Management System
            </motion.p>
          </div>

          <div className="space-y-4">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.1 }}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white font-medium text-lg">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl"
              >
                <LogIn className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to continue to your dashboard</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-12 pr-4 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 ${
                      focusedField === 'username'
                        ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-500/20'
                        : 'border-gray-200'
                    }`}
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full pl-12 pr-12 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 ${
                      focusedField === 'password'
                        ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-500/20'
                        : 'border-gray-200'
                    }`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <span className="text-sm text-gray-600 font-medium">Remember me</span>
                </label>
                <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600 mb-4 font-semibold">Demo Accounts:</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                  <div className="font-bold text-blue-900">Admin</div>
                  <div className="text-blue-700 mt-1">admin</div>
                  <div className="text-blue-600">admin123</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                  <div className="font-bold text-purple-900">Landlord</div>
                  <div className="text-purple-700 mt-1">landlord1</div>
                  <div className="text-purple-600">landlord123</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <div className="font-bold text-green-900">Tenant</div>
                  <div className="text-green-700 mt-1">felix</div>
                  <div className="text-green-600">tenant123</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-white/80 text-sm">
            © 2025 Spiraldart TMS. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ModernLogin;