import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, CreditCard, AlertCircle, Save, Edit, X, Check, Home, Calendar, DollarSign } from 'lucide-react';

const TenantProfile = ({ user, formatCurrency, formatDate }) => {
  const [tenantData, setTenantData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    id_number: ''
  });

  useEffect(() => {
    fetchTenantProfile();
  }, []);

  const fetchTenantProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tenants/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setTenantData(data);
        setFormData({
          full_name: data.tenant.full_name || '',
          phone: data.tenant.phone || '',
          email: data.tenant.email || '',
          emergency_contact: data.tenant.emergency_contact || '',
          id_number: data.tenant.id_number || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch tenant profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tenants/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
        fetchTenantProfile();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      full_name: tenantData.tenant.full_name || '',
      phone: tenantData.tenant.phone || '',
      email: tenantData.tenant.email || '',
      emergency_contact: tenantData.tenant.emergency_contact || '',
      id_number: tenantData.tenant.id_number || ''
    });
    setMessage({ type: '', text: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-maroon-900 border-t-transparent"></div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No tenant profile found</p>
      </div>
    );
  }

  const { tenant, lease, unit, property } = tenantData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <p className="text-gray-600">Manage your personal information</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800"
          >
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">Personal Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                {editing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Number
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.id_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_number: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.id_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0722222222"
                  />
                ) : (
                  <p className="text-gray-900">{tenant.emergency_contact || 'Not provided'}</p>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lease Information */}
        <div className="space-y-6">
          {/* Current Lease */}
          {lease ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Current Lease</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-maroon-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Unit</p>
                    <p className="font-medium">{unit?.name}</p>
                    <p className="text-sm text-gray-600">{property?.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-maroon-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="font-medium">{formatCurrency(lease.rent_amount)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-maroon-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Lease Period</p>
                    <p className="font-medium text-sm">{formatDate(lease.start_date)}</p>
                    <p className="text-sm text-gray-600">to {formatDate(lease.end_date)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lease.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {lease.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4">Current Lease</h3>
              <div className="text-center py-8">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No active lease</p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-maroon-50 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 text-maroon-900">Account Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profile Completion</span>
                <span className="font-medium">
                  {[tenant.full_name, tenant.phone, tenant.email, tenant.id_number, tenant.emergency_contact].filter(Boolean).length * 20}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-maroon-600 h-2 rounded-full transition-all"
                  style={{ width: `${[tenant.full_name, tenant.phone, tenant.email, tenant.id_number, tenant.emergency_contact].filter(Boolean).length * 20}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantProfile;
