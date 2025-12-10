import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Check, X, Eye, EyeOff, UserPlus, Building2, Home } from 'lucide-react';

const UserManagement = ({ formatDate, properties }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // Multi-step form
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'tenant',
    is_active: true,
    permissions: {},
    // Tenant specific
    tenant_details: {
      full_name: '',
      phone: '',
      id_number: '',
      emergency_contact: ''
    },
    // Landlord specific
    landlord_details: {
      properties: [] // Can assign existing or create new
    }
  });

  // All available permissions
  const allPermissions = [
    { key: 'viewDashboard', label: 'View Dashboard', description: 'Access to main dashboard' },
    { key: 'manageTenants', label: 'Manage Tenants', description: 'Add, edit, delete tenants' },
    { key: 'manageUnits', label: 'Manage Units', description: 'Add, edit, delete units' },
    { key: 'manageProperties', label: 'Manage Properties', description: 'Add, edit, delete properties' },
    { key: 'managePayments', label: 'Manage Payments', description: 'Record and view payments' },
    { key: 'manageExpenses', label: 'Manage Expenses', description: 'Record and view expenses' },
    { key: 'manageMaintenance', label: 'Manage Maintenance', description: 'Handle maintenance requests' },
    { key: 'manageLeases', label: 'Manage Leases', description: 'Create and edit leases' },
    { key: 'terminateLease', label: 'Terminate Leases', description: 'End active leases' },
    { key: 'generateReports', label: 'Generate Reports', description: 'Access reports section' },
    { key: 'manageUsers', label: 'Manage Users', description: 'Create and manage user accounts' },
    { key: 'allocateUnits', label: 'Allocate Units', description: 'Assign tenants to units' },
    { key: 'viewAllData', label: 'View All Data', description: 'Access all properties/tenants' }
  ];

  // Default permissions by role
  const defaultPermissions = {
    admin: {
      viewDashboard: true, manageTenants: true, manageUnits: true, manageProperties: true,
      managePayments: true, manageExpenses: true, manageMaintenance: true, manageLeases: true,
      terminateLease: true, generateReports: true, manageUsers: true, allocateUnits: true, viewAllData: true
    },
    landlord: {
      viewDashboard: true, manageTenants: true, manageUnits: true, manageProperties: true,
      managePayments: true, manageExpenses: true, manageMaintenance: true, manageLeases: true,
      terminateLease: true, generateReports: true, manageUsers: false, allocateUnits: true, viewAllData: false
    },
    tenant: {
      viewDashboard: true, manageTenants: false, manageUnits: false, manageProperties: false,
      managePayments: false, manageExpenses: false, manageMaintenance: true, manageLeases: false,
      terminateLease: false, generateReports: false, manageUsers: false, allocateUnits: false, viewAllData: false
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: { ...defaultPermissions[role] }
    }));
  };

  const handlePermissionChange = (permKey) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permKey]: !prev.permissions[permKey]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation based on role
    if (formData.role === 'tenant' && !formData.tenant_details.full_name) {
      setError('Full name is required for tenant');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const url = editingUser 
        ? `http://localhost:5000/api/users/${editingUser.id}`
        : 'http://localhost:5000/api/users';
      
      const method = editingUser ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        fetchUsers();
        closeModal();
        // User created successfully - will appear in appropriate tab
      } else {
        setError(data.error || 'Failed to save user');
      }
    } catch (error) {
      setError('Failed to save user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setStep(1);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'tenant',
      is_active: true,
      permissions: { ...defaultPermissions.tenant },
      tenant_details: {
        full_name: '',
        phone: '',
        id_number: '',
        emergency_contact: ''
      },
      landlord_details: {
        properties: []
      }
    });
    setShowModal(true);
    setError('');
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setStep(1);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      is_active: user.is_active,
      permissions: user.permissions || defaultPermissions[user.role],
      tenant_details: {
        full_name: '',
        phone: '',
        id_number: '',
        emergency_contact: ''
      },
      landlord_details: {
        properties: []
      }
    });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setStep(1);
    setError('');
  };

  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.username || !formData.email || (!formData.password && !editingUser)) {
        setError('Please fill in all required fields');
        return;
      }
    }
    setError('');
    setStep(step + 1);
  };

  const prevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'landlord': return 'bg-blue-100 text-blue-700';
      case 'tenant': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage users and their permissions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Admins</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Landlords</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.role === 'landlord').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Tenants</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.role === 'tenant').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">Role</th>
              <th className="text-left p-4 font-semibold">Status</th>
              <th className="text-left p-4 font-semibold">Created</th>
              <th className="text-left p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit User"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal - Multi-Step */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-maroon-50 rounded-lg">
                  <Shield className="w-6 h-6 text-maroon-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Step {step} of {formData.role === 'tenant' ? 3 : formData.role === 'landlord' ? 2 : 2}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Step 1: Basic Info & Role */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!editingUser && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 pr-10"
                        placeholder={editingUser ? 'Leave blank to keep current' : ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['admin', 'landlord', 'tenant'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleRoleChange(role)}
                          className={`p-3 rounded-lg border-2 text-center capitalize font-medium transition-colors ${
                            formData.role === role
                              ? 'border-maroon-600 bg-maroon-50 text-maroon-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 text-maroon-600 rounded"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                      Account Active
                    </label>
                  </div>
                </>
              )}

              {/* Step 2: Role-Specific Details */}
              {step === 2 && formData.role === 'tenant' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Tenant Profile Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.tenant_details.full_name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tenant_details: { ...prev.tenant_details, full_name: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.tenant_details.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tenant_details: { ...prev.tenant_details, phone: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="0712345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ID Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.tenant_details.id_number}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tenant_details: { ...prev.tenant_details, id_number: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        value={formData.tenant_details.emergency_contact}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tenant_details: { ...prev.tenant_details, emergency_contact: e.target.value }
                        }))}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="0722222222"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ After creating this tenant, you can allocate them to a unit from the Tenants tab.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2/3: Permissions */}
              {((step === 2 && formData.role !== 'tenant') || (step === 3 && formData.role === 'tenant')) && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Permissions
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        permissions: { ...defaultPermissions[formData.role] }
                      }))}
                      className="text-xs text-maroon-600 hover:text-maroon-800"
                    >
                      Reset to defaults
                    </button>
                  </div>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {allPermissions.map(perm => (
                      <label
                        key={perm.key}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium text-sm">{perm.label}</p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.permissions[perm.key] || false}
                          onChange={() => handlePermissionChange(perm.key)}
                          className="w-4 h-4 text-maroon-600 rounded"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={step > 1 ? prevStep : closeModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {step > 1 ? 'Previous' : 'Cancel'}
                </button>
                
                {((step === 2 && formData.role !== 'tenant') || (step === 3)) ? (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800"
                  >
                    Next
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
