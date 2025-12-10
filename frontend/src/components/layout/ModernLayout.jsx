import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Building2, Grid, Users, FileText, DollarSign, Wrench, TrendingUp,
  BarChart3, Shield, Settings, Menu, X, Bell, Search, ChevronDown, LogOut
} from 'lucide-react';

const ModernLayout = ({ children, user, activeTab, setActiveTab, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['admin', 'landlord', 'tenant'] },
    { id: 'properties', label: 'Properties', icon: Building2, roles: ['admin', 'landlord'] },
    { id: 'units', label: 'Units', icon: Grid, roles: ['admin', 'landlord'] },
    { id: 'tenants', label: 'Tenants', icon: Users, roles: ['admin', 'landlord'] },
    { id: 'leases', label: 'Leases', icon: FileText, roles: ['admin', 'landlord', 'tenant'] },
    { id: 'payments', label: 'Payments', icon: DollarSign, roles: ['admin', 'landlord', 'tenant'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['admin', 'landlord', 'tenant'] },
    { id: 'expenses', label: 'Expenses', icon: TrendingUp, roles: ['admin', 'landlord'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'landlord'] },
    { id: 'users', label: 'Users', icon: Shield, roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-6">
        {/* Left: Logo + Menu Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">Spiraldart</h1>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties, tenants, leases..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile Dropdown */}
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-gray-900">{user?.username}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center text-blue-700 font-semibold text-sm">
              {user?.username?.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 z-30 overflow-y-auto"
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Settings & Logout at Bottom */}
          <div className="pt-4 mt-4 border-t border-gray-200 space-y-1">
            <button
              onClick={() => setActiveTab('settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 pt-16 ${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        }`}
      >
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModernLayout;

