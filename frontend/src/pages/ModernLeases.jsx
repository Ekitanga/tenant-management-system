import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Eye, Download, Calendar, DollarSign, Home, User } from 'lucide-react';
import LeaseWorkflow from '../components/LeaseWorkflow';

const ModernLeases = ({ formatDate, formatCurrency }) => {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedLease, setSelectedLease] = useState(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchLeases();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (error) {
        console.error('Failed to parse token:', error);
      }
    }
  };

  const fetchLeases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/leases', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setLeases(data.leases || []);
      }
    } catch (error) {
      console.error('Failed to fetch leases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageLease = (lease) => {
    setSelectedLease(lease);
    setShowWorkflow(true);
  };

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || lease.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: leases.length,
    active: leases.filter(l => l.status === 'active').length,
    pending: leases.filter(l => l.status === 'pending_tenant' || l.status === 'pending_landlord').length,
    draft: leases.filter(l => l.status === 'draft').length,
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-50 text-green-700 ring-1 ring-green-600/20',
      pending_tenant: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
      pending_landlord: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
      draft: 'bg-gray-50 text-gray-700 ring-1 ring-gray-600/20',
      rejected: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
    };

    const labels = {
      active: 'Active',
      pending_tenant: 'Awaiting Tenant',
      pending_landlord: 'Awaiting Landlord',
      draft: 'Draft',
      rejected: 'Rejected',
    };

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Leases</h1>
        <p className="text-gray-600 mt-1">Manage lease agreements</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by tenant, unit, or property..."
            className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_tenant">Awaiting Tenant</option>
            <option value="pending_landlord">Awaiting Landlord</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leases', value: stats.total, color: 'blue' },
          { label: 'Active', value: stats.active, color: 'green' },
          { label: 'Pending', value: stats.pending, color: 'amber' },
          { label: 'Draft', value: stats.draft, color: 'gray' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
          >
            <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
            <div className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Property</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rent</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                      Loading leases...
                    </div>
                  </td>
                </tr>
              ) : filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No leases found
                  </td>
                </tr>
              ) : (
                filteredLeases.map((lease) => (
                  <tr key={lease.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{lease.tenant_name}</div>
                          <div className="text-xs text-gray-500">{lease.tenant_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{lease.unit_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{lease.property_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{formatCurrency(lease.rent_amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">{formatDate(lease.start_date)}</div>
                        <div className="text-gray-500">to {formatDate(lease.end_date)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(lease.status)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleManageLease(lease)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Modal */}
      {showWorkflow && selectedLease && (
        <LeaseWorkflow
          lease={selectedLease}
          onClose={() => {
            setShowWorkflow(false);
            setSelectedLease(null);
          }}
          onUpdate={() => {
            fetchLeases();
            setShowWorkflow(false);
            setSelectedLease(null);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ModernLeases;
