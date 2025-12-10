import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Eye } from 'lucide-react';
import LeaseWorkflow from '../components/LeaseWorkflow';

const Leases = ({ formatDate, formatCurrency }) => {
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

  const handleCloseWorkflow = () => {
    setShowWorkflow(false);
    setSelectedLease(null);
  };

  const handleWorkflowUpdate = () => {
    fetchLeases();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'pending_tenant': return 'bg-yellow-100 text-yellow-700';
      case 'pending_landlord': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'terminated': return 'bg-red-100 text-red-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending_tenant': return 'Awaiting Tenant';
      case 'pending_landlord': return 'Awaiting Approval';
      case 'active': return 'Active';
      case 'expired': return 'Expired';
      case 'terminated': return 'Terminated';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lease.property_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || lease.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-maroon-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leases</h2>
          <p className="text-gray-600">Manage lease agreements</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by tenant, unit, or property..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-700 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-maroon-700 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_tenant">Awaiting Tenant</option>
              <option value="pending_landlord">Awaiting Approval</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <p className="text-sm text-gray-600 mb-1">Total Leases</p>
          <p className="text-3xl font-bold text-gray-900">{leases.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-3xl font-bold text-green-600">
            {leases.filter(l => l.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-3xl font-bold text-yellow-600">
            {leases.filter(l => l.status === 'pending_tenant' || l.status === 'pending_landlord').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-md">
          <p className="text-sm text-gray-600 mb-1">Draft</p>
          <p className="text-3xl font-bold text-gray-600">
            {leases.filter(l => l.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Leases Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Property</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Rent</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">No leases found</p>
                    <p className="text-sm">Create a new lease to get started</p>
                  </td>
                </tr>
              ) : (
                filteredLeases.map((lease) => (
                  <tr key={lease.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lease.tenant_name}</div>
                      <div className="text-sm text-gray-500">{lease.tenant_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lease.unit_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{lease.property_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {formatCurrency ? formatCurrency(lease.rent_amount) : `KES ${lease.rent_amount?.toLocaleString()}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate ? formatDate(lease.start_date) : lease.start_date}
                      </div>
                      <div className="text-sm text-gray-500">
                        to {formatDate ? formatDate(lease.end_date) : lease.end_date}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lease.status)}`}>
                        {getStatusLabel(lease.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleManageLease(lease)}
                        className="text-maroon-600 hover:text-maroon-800 font-medium flex items-center gap-1"
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

      {/* Lease Workflow Modal */}
      {showWorkflow && selectedLease && (
        <LeaseWorkflow
          lease={selectedLease}
          currentUser={currentUser}
          onClose={handleCloseWorkflow}
          onUpdate={handleWorkflowUpdate}
        />
      )}
    </div>
  );
};

export default Leases;
