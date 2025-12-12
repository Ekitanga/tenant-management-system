import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import TenantDashboard from './TenantDashboard';
import {
  authAPI,
  dashboardAPI,
  propertiesAPI,
  unitsAPI,
  tenantsAPI,
  leasesAPI,
  paymentsAPI,
  expensesAPI,
  maintenanceAPI,
  usersAPI
} from './api';
import TenantLeases from './TenantLeases';
import Reports from './Reports';  // ADD THIS LINE

const socket = io('http://localhost:5000', {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dashboard stats
  const [stats, setStats] = useState({});

  // Data states
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [users, setUsers] = useState([]);

  // Form states
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showLeaseForm, setShowLeaseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showLeasePreview, setShowLeasePreview] = useState(false);
  const [selectedLease, setSelectedLease] = useState(null);
  // M-PESA states
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaForm, setMpesaForm] = useState({ phone: '', amount: '', lease_id: '' });
  const [mpesaStatus, setMpesaStatus] = useState(null);
  const [mpesaTransactionId, setMpesaTransactionId] = useState(null);
  // Edit states
const [editingProperty, setEditingProperty] = useState(null);
const [editingUnit, setEditingUnit] = useState(null);
const [editingTenant, setEditingTenant] = useState(null);
const [editingExpense, setEditingExpense] = useState(null);
const [editingMaintenance, setEditingMaintenance] = useState(null);
const [editingLease, setEditingLease] = useState(null);

  // Form data
  const [propertyForm, setPropertyForm] = useState({ name: '', location: '', description: '' });
  const [unitForm, setUnitForm] = useState({ property_id: '', name: '', rent_amount: '', deposit_amount: '', bedrooms: 1, bathrooms: 1 });
  const [tenantForm, setTenantForm] = useState({ full_name: '', email: '', phone: '', id_number: '', emergency_contact: '', emergency_phone: '' });
  const [leaseForm, setLeaseForm] = useState({ tenant_id: '', unit_id: '', start_date: '', end_date: '', rent_amount: '', deposit_amount: '' });
  const [paymentForm, setPaymentForm] = useState({ lease_id: '', amount: '', payment_date: '', payment_method: 'mpesa', reference_number: '', notes: '' });
  const [expenseForm, setExpenseForm] = useState({ property_id: '', category: 'maintenance', description: '', amount: '', expense_date: '', vendor: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ unit_id: '', title: '', description: '', priority: 'medium' });
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '', role: 'tenant' });

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Socket connection
  useEffect(() => {
    if (user) {
      socket.auth.token = localStorage.getItem('token');
      socket.connect();

      socket.on('connect', () => {
        console.log('✅ Socket connected');
      });

      socket.on('dashboard:refresh', () => {
        fetchDashboardStats();
      });

      socket.on('lease:sent', () => {
        fetchLeases();
      });

      socket.on('lease:accepted', () => {
        fetchLeases();
      });

      socket.on('lease:rejected', () => {
        fetchLeases();
      });

      socket.on('payment:created', () => {
        fetchPayments();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const data = await authAPI.getMe();
      setUser(data.user);
      setLoading(false);
      fetchDashboardStats();
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await authAPI.login(loginForm.username, loginForm.password);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    socket.disconnect();
  };

  // Fetch functions
  const fetchDashboardStats = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats(data.stats);
    } catch (error) {
      console.error('Stats error:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      const data = await propertiesAPI.getAll();
      setProperties(data.properties);
    } catch (error) {
      console.error('Properties error:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      const data = await unitsAPI.getAll();
      setUnits(data.units);
    } catch (error) {
      console.error('Units error:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const data = await tenantsAPI.getAll();
      setTenants(data.tenants);
    } catch (error) {
      console.error('Tenants error:', error);
    }
  };

  const fetchLeases = async () => {
    try {
      const data = await leasesAPI.getAll();
      setLeases(data.leases);
    } catch (error) {
      console.error('Leases error:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const data = await paymentsAPI.getAll();
      setPayments(data.payments);
    } catch (error) {
      console.error('Payments error:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await expensesAPI.getAll();
      setExpenses(data.expenses);
    } catch (error) {
      console.error('Expenses error:', error);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const data = await maintenanceAPI.getAll();
      setMaintenance(data.requests);
    } catch (error) {
      console.error('Maintenance error:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data.users);
    } catch (error) {
      console.error('Users error:', error);
    }
  };

  // Auto-fetch on tab change
  useEffect(() => {
    if (!user) return;

    switch (activeTab) {
      case 'dashboard':
        fetchDashboardStats();
        break;
      case 'properties':
        fetchProperties();
        break;
      case 'units':
        fetchUnits();
        fetchProperties();
        break;
      case 'tenants':
        fetchTenants();
        break;
      case 'leases':
      case 'my-leases':
        fetchLeases();
        fetchTenants();
        fetchUnits();
        break;
      case 'payments':
        fetchPayments();
        fetchLeases();
        break;
      case 'expenses':
        fetchExpenses();
        fetchProperties();
        break;
      case 'maintenance':
        fetchMaintenance();
        fetchUnits();
        break;
      case 'users':
        fetchUsers();
        break;
      default:
        break;
    }
  }, [activeTab, user]);

  // Handle Send Lease
  const handleSendLease = async (leaseId) => {
    try {
      await leasesAPI.sendLease(leaseId);
      alert('✅ Lease sent to tenant successfully!');
      fetchLeases();
    } catch (error) {
      console.error('Send lease error:', error);
      alert(error.message || 'Failed to send lease');
    }
  };

  // Create handlers
const handleCreateProperty = async (e) => {
  e.preventDefault();
  
  if (editingProperty) {
    return handleUpdateProperty(e);
  }
  
  try {
    await propertiesAPI.create(propertyForm);
    alert('Property created successfully!');
    setShowPropertyForm(false);
    setPropertyForm({ name: '', location: '', description: '' });
    fetchProperties();
    fetchDashboardStats();
  } catch (error) {
    alert(error.message || 'Failed to create property');
  }
};

const handleCreateUnit = async (e) => {
  e.preventDefault();
  
  if (editingUnit) {
    return handleUpdateUnit(e);
  }
  
  try {
    await unitsAPI.create(unitForm);
    alert('Unit created successfully!');
    setShowUnitForm(false);
    setUnitForm({ property_id: '', name: '', rent_amount: '', deposit_amount: '', bedrooms: 1, bathrooms: 1 });
    fetchUnits();
    fetchDashboardStats();
  } catch (error) {
    alert(error.message || 'Failed to create unit');
  }
};

const handleCreateTenant = async (e) => {
  e.preventDefault();
  
  if (editingTenant) {
    return handleUpdateTenant(e);
  }
  
  try {
    const response = await tenantsAPI.create(tenantForm);
    
    if (response.tempPassword) {
      alert(`✅ Tenant and user account created successfully!\n\n` +
            `Email/Username: ${response.username}\n` +
            `Temporary Password: ${response.tempPassword}\n\n` +
            `⚠️ Please share these credentials with the tenant securely.`);
    } else {
      alert('Tenant created successfully!');
    }
    
    setShowTenantForm(false);
    setTenantForm({ full_name: '', email: '', phone: '', id_number: '', emergency_contact: '', emergency_phone: '' });
    fetchTenants();
    fetchDashboardStats();
  } catch (error) {
    alert(error.message || 'Failed to create tenant');
  }
};

const handleUpdateTenant = async (e) => {
  e.preventDefault();
  
  try {
    const token = localStorage.getItem('token');
const response = await fetch(`http://localhost:5000/api/tenants/${editingTenant.tenant_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(tenantForm)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update tenant');
    }

    alert('✅ Tenant updated successfully!');
    setShowTenantForm(false);
    setEditingTenant(null);
    setTenantForm({ 
      full_name: '', 
      email: '', 
      phone: '', 
      id_number: '', 
      emergency_contact: '', 
      emergency_phone: '' 
    });
    fetchTenants();
  } catch (error) {
    console.error('Update tenant error:', error);
    alert('❌ Error: ' + error.message);
  }
};


const handleCreateLease = async (e) => {
  e.preventDefault();
  
  if (editingLease) {
    return handleUpdateLease(e);
  }
  
  try {
    await leasesAPI.create(leaseForm);
    alert('Lease created successfully!');
    setShowLeaseForm(false);
    setLeaseForm({ tenant_id: '', unit_id: '', start_date: '', end_date: '', rent_amount: '', deposit_amount: '' });
    fetchLeases();
    fetchDashboardStats();
  } catch (error) {
    alert(error.message || 'Failed to create lease');
  }
};

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    try {
      await paymentsAPI.create(paymentForm);
      alert('Payment recorded successfully!');
      setShowPaymentForm(false);
      setPaymentForm({ lease_id: '', amount: '', payment_date: '', payment_method: 'mpesa', reference_number: '', notes: '' });
      fetchPayments();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to record payment');
    }
  };

const handleCreateExpense = async (e) => {
  e.preventDefault();
  
  if (editingExpense) {
    return handleUpdateExpense(e);
  }
  
  try {
    await expensesAPI.create(expenseForm);
    alert('Expense recorded successfully!');
    setShowExpenseForm(false);
    setExpenseForm({ property_id: '', category: 'maintenance', description: '', amount: '', expense_date: '', vendor: '' });
    fetchExpenses();
  } catch (error) {
    alert(error.message || 'Failed to record expense');
  }
};

const handleCreateMaintenance = async (e) => {
  e.preventDefault();
  
  if (editingMaintenance) {
    return handleUpdateMaintenance(e);
  }
  
  try {
    await maintenanceAPI.create(maintenanceForm);
    alert('Maintenance request created successfully!');
    setShowMaintenanceForm(false);
    setMaintenanceForm({ unit_id: '', title: '', description: '', priority: 'medium' });
    fetchMaintenance();
  } catch (error) {
    alert(error.message || 'Failed to create maintenance request');
  }
};

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.create(userForm);
      alert('User created successfully!');
      setShowUserForm(false);
      setUserForm({ username: '', email: '', password: '', role: 'tenant' });
      fetchUsers();
    } catch (error) {
      alert(error.message || 'Failed to create user');
    }
  };

  // Delete handlers
  const handleDeleteProperty = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await propertiesAPI.delete(id);
      alert('Property deleted successfully!');
      fetchProperties();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to delete property');
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;
    try {
      await unitsAPI.delete(id);
      alert('Unit deleted successfully!');
      fetchUnits();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to delete unit');
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;
    try {
      await tenantsAPI.delete(id);
      alert('Tenant deleted successfully!');
      fetchTenants();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to delete tenant');
    }
  };

  const handleDeleteLease = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lease?')) return;
    try {
      await leasesAPI.delete(id);
      alert('Lease deleted successfully!');
      fetchLeases();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to delete lease');
    }
  };

  const handleTerminateLease = async (leaseId, reason) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/leases/${leaseId}/terminate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ termination_reason: reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to terminate lease');
    }

    alert('✅ Lease terminated successfully');
    fetchLeases();
    fetchDashboardStats();
  } catch (error) {
    alert('❌ Error: ' + error.message);
  }
};

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      await paymentsAPI.delete(id);
      alert('Payment deleted successfully!');
      fetchPayments();
      fetchDashboardStats();
    } catch (error) {
      alert(error.message || 'Failed to delete payment');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesAPI.delete(id);
      alert('Expense deleted successfully!');
      fetchExpenses();
    } catch (error) {
      alert(error.message || 'Failed to delete expense');
    }
  };

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance request?')) return;
    try {
      await maintenanceAPI.delete(id);
      alert('Maintenance request deleted successfully!');
      fetchMaintenance();
    } catch (error) {
      alert(error.message || 'Failed to delete maintenance request');
    }
  };

const handleDeleteUser = async (id) => {
  if (!window.confirm('Are you sure you want to delete this user?')) return;
  try {
    await usersAPI.delete(id);
    alert('User deleted successfully!');
    fetchUsers();
  } catch (error) {
    alert(error.message || 'Failed to delete user');
  }
};

// ADD THIS NEW FUNCTION HERE ⬇️
const handleResetTenantPassword = async (tenantId, email) => {
  const newPassword = prompt(`Enter new password for tenant (${email}):`);
  
  if (!newPassword) return;
  
  if (newPassword.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/tenants/${tenantId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    const data = await response.json();

    alert(`✅ Password reset successfully!\n\n` +
          `Username/Email: ${data.username || email}\n` +
          `New Password: ${newPassword}\n\n` +
          `⚠️ IMPORTANT: The tenant must login using their EMAIL as the username.\n` +
          `Please share these credentials with the tenant securely.`);
  } catch (error) {
    alert('Error: ' + error.message);
  }
};


const handleSendRentReminders = async () => {
  if (!window.confirm('Send rent reminders to all tenants with outstanding balances?\n\nThis will send SMS to all tenants with arrears.')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/sms/rent-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send reminders');
    }

    const data = await response.json();
    
    let message = `✅ Rent Reminders Sent!\n\n`;
    message += `Total Tenants: ${data.total}\n`;
    message += `✅ Sent: ${data.sent}\n`;
    message += `❌ Failed: ${data.failed}\n`;
    
    if (data.failedDetails && data.failedDetails.length > 0) {
      message += `\nFailed:\n`;
      data.failedDetails.forEach(f => {
        message += `- ${f.name}: ${f.reason}\n`;
      });
    }

    alert(message);
  } catch (error) {
    alert('Error: ' + error.message);
  }
};


// M-PESA Payment Handler
const handleMpesaPayment = async (e) => {
  e.preventDefault();
  
  console.log('📤 Submitting M-PESA payment...');
  console.log('Form data:', mpesaForm);
  
  // Validate
  if (!mpesaForm.phone || !mpesaForm.amount || !mpesaForm.lease_id) {
    alert('⚠️ Missing required fields');
    return;
  }
  
  try {
    setMpesaStatus({ type: 'loading', message: 'Initiating payment...' });
    
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/mpesa/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        phone_number: mpesaForm.phone,
        amount: mpesaForm.amount,
        lease_id: mpesaForm.lease_id,
        account_reference: `Rent-${mpesaForm.lease_id}`,
        transaction_desc: 'Rent Payment'
      })
    });

    const data = await response.json();
    console.log('📥 Backend response:', data);

    if (data.success) {
      setMpesaTransactionId(data.transactionId);
      setMpesaStatus({ 
        type: 'success', 
        message: 'Payment request sent! Please check your phone and enter your M-PESA PIN.' 
      });
      
      pollPaymentStatus(data.transactionId);
      
    } else {
      console.error('❌ Backend error:', data);
      setMpesaStatus({ 
        type: 'error', 
        message: data.error || 'Failed to initiate payment' 
      });
    }

  } catch (error) {
    console.error('❌ M-PESA payment error:', error);
    setMpesaStatus({ 
      type: 'error', 
      message: 'Failed to initiate payment. Please try again.' 
    });
  }
};

// Poll payment status
const pollPaymentStatus = async (transactionId) => {
  let attempts = 0;
  const maxAttempts = 30;
  
  const interval = setInterval(async () => {
    attempts++;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/mpesa/transaction/${transactionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      const transaction = data.transaction;
      
if (transaction.status === 'completed') {
  clearInterval(interval);
  
  // Show success message
  setMpesaStatus({ 
    type: 'success', 
    message: `✅ Payment Successful!\n\nReceipt Number: ${transaction.mpesa_receipt_number}\nAmount: KES ${transaction.amount}\n\nWindow will close in 3 seconds...` 
  });
  
  console.log('✅ Payment completed successfully!');
  
  // Auto-close after 3 seconds and refresh data
  setTimeout(() => {
    console.log('🔄 Closing modal and refreshing data...');
    setShowMpesaModal(false);
    setMpesaStatus(null);
    setMpesaForm({ phone: '', amount: '', lease_id: '' });
    fetchPayments();
    fetchDashboardStats();
    if (activeTab === 'my-leases') {
      fetchLeases();
    }
    
    // Show a final confirmation
    alert('✅ Payment of KES ' + transaction.amount + ' received!\n\nReceipt: ' + transaction.mpesa_receipt_number);
  }, 3000);
        
      } else if (transaction.status === 'failed') {
        clearInterval(interval);
        setMpesaStatus({ 
          type: 'error', 
          message: `❌ Payment failed: ${transaction.result_desc}` 
        });
        
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setMpesaStatus({ 
          type: 'warning', 
          message: '⏱️ Payment pending. Please check your payment status in a few minutes.' 
        });
      }
      
    } catch (error) {
      console.error('Status poll error:', error);
    }
  }, 2000); // Poll every 2 seconds
};

// Edit handlers
const handleEditProperty = (property) => {
  setEditingProperty(property);
  setPropertyForm({
    name: property.name,
    location: property.location,
    description: property.description || ''
  });
  setShowPropertyForm(true);
};

const handleUpdateProperty = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/properties/${editingProperty.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(propertyForm)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update property');
    }
    
    alert('Property updated successfully!');
    setShowPropertyForm(false);
    setEditingProperty(null);
    setPropertyForm({ name: '', location: '', description: '' });
    fetchProperties(); // ✅ REFRESH DATA
  } catch (error) {
    alert('Failed to update property');
  }
};

const handleEditUnit = (unit) => {
  setEditingUnit(unit);
  setUnitForm({
    property_id: unit.property_id,
    name: unit.name,
    rent_amount: unit.rent_amount,
    deposit_amount: unit.deposit_amount,
    bedrooms: unit.bedrooms,
    bathrooms: unit.bathrooms
  });
  setShowUnitForm(true);
};

const handleUpdateUnit = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/units/${editingUnit.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(unitForm)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update unit');
    }
    
    alert('Unit updated successfully!');
    setShowUnitForm(false);
    setEditingUnit(null);
    setUnitForm({ property_id: '', name: '', rent_amount: '', deposit_amount: '', bedrooms: 1, bathrooms: 1 });
    fetchUnits(); // ✅ REFRESH DATA
  } catch (error) {
    alert('Failed to update unit');
  }
};

const handleEditTenant = (tenant) => {
  setEditingTenant(tenant);
  setTenantForm({
    full_name: tenant.full_name,
    email: tenant.email,
    phone: tenant.phone || '',
    id_number: tenant.id_number || '',
    emergency_contact: tenant.emergency_contact || '',
    emergency_phone: tenant.emergency_phone || ''
  });
  setShowTenantForm(true);
};


const handleEditExpense = (expense) => {
  setEditingExpense(expense);
  setExpenseForm({
    property_id: expense.property_id,
    category: expense.category,
    description: expense.description,
    amount: expense.amount,
    expense_date: expense.expense_date,
    vendor: expense.vendor || ''
  });
  setShowExpenseForm(true);
};

const handleUpdateExpense = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/expenses/${editingExpense.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(expenseForm)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update expense');
    }
    
    alert('Expense updated successfully!');
    setShowExpenseForm(false);
    setEditingExpense(null);
    setExpenseForm({ property_id: '', category: 'maintenance', description: '', amount: '', expense_date: '', vendor: '' });
    fetchExpenses(); // ✅ REFRESH DATA
  } catch (error) {
    alert('Failed to update expense');
  }
};

const handleEditMaintenance = (request) => {
  setEditingMaintenance(request);
  setMaintenanceForm({
    unit_id: request.unit_id,
    title: request.title,
    description: request.description,
    priority: request.priority
  });
  setShowMaintenanceForm(true);
};

const handleUpdateMaintenance = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/maintenance/${editingMaintenance.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...maintenanceForm,
        status: editingMaintenance.status // Keep existing status
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update maintenance request');
    }
    
    alert('Maintenance request updated successfully!');
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
    setMaintenanceForm({ unit_id: '', title: '', description: '', priority: 'medium' });
    fetchMaintenance(); // ✅ REFRESH DATA
  } catch (error) {
    alert('Failed to update maintenance request');
  }
};

const handleEditLease = (lease) => {
  setEditingLease(lease);
  setLeaseForm({
    tenant_id: lease.tenant_id,
    unit_id: lease.unit_id,
    start_date: lease.start_date,
    end_date: lease.end_date,
    rent_amount: lease.rent_amount,
    deposit_amount: lease.deposit_amount
  });
  setShowLeaseForm(true);
};

const handleUpdateLease = async (e) => {
  e.preventDefault();
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/leases/${editingLease.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leaseForm)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update lease');
    }

    alert('Lease updated successfully!');
    setShowLeaseForm(false);
    setEditingLease(null);
    setLeaseForm({ tenant_id: '', unit_id: '', start_date: '', end_date: '', rent_amount: '', deposit_amount: '' });
    fetchLeases();
  } catch (error) {
    alert('Error: ' + error.message);
  }
};


// Handle unit selection to auto-populate lease amounts (this was already there)
const handleUnitSelection = (e) => {
  const unitId = e.target.value;
  setLeaseForm({ ...leaseForm, unit_id: unitId });
  
  const selectedUnit = units.find(u => u.id === parseInt(unitId));
  if (selectedUnit) {
    setLeaseForm(prev => ({
      ...prev,
      unit_id: unitId,
      rent_amount: selectedUnit.rent_amount,
      deposit_amount: selectedUnit.deposit_amount || 0
    }));
  }
};

  // Get navigation items based on role
  const getNavItems = () => {
    if (!user) return [];

    if (user.role === 'admin') {
      return [
        { key: 'dashboard', label: 'Dashboard', icon: '📊' },
        { key: 'properties', label: 'Properties', icon: '🏢' },
        { key: 'units', label: 'Units', icon: '🏠' },
        { key: 'tenants', label: 'Tenants', icon: '👥' },
        { key: 'leases', label: 'Lease Management', icon: '📄' },
        { key: 'payments', label: 'Payments', icon: '💰' },
        { key: 'expenses', label: 'Expenses', icon: '💸' },
        { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { key: 'reports', label: 'Reports', icon: '📈' },
        { key: 'users', label: 'Users', icon: '👤' },
      ];
    }

    if (user.role === 'landlord') {
      return [
        { key: 'dashboard', label: 'Dashboard', icon: '📊' },
        { key: 'properties', label: 'Properties', icon: '🏢' },
        { key: 'units', label: 'Units', icon: '🏠' },
        { key: 'tenants', label: 'Tenants', icon: '👥' },
        { key: 'leases', label: 'Lease Management', icon: '📄' },
        { key: 'payments', label: 'Payments', icon: '💰' },
        { key: 'expenses', label: 'Expenses', icon: '💸' },
        { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
        { key: 'reports', label: 'Reports', icon: '📈' },
        { key: 'sms', label: 'SMS Reminders', icon: '📱' },  // ADD THIS LINE
       { key: 'mpesa', label: 'M-PESA Transactions', icon: '💳' },  // ADD THIS
  ];
    }

    if (user.role === 'tenant') {
      return [
        { key: 'dashboard', label: 'Dashboard', icon: '📊' },
        { key: 'my-leases', label: 'My Leases', icon: '📄' },
        { key: 'payments', label: 'Payments', icon: '💰' },
        { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
      ];
    }

    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-96">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Spiraldart TMS</h1>
            <p className="text-gray-600">Tenant Management System</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 font-semibold transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Spiraldart TMS</h1>
              <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                {user.role.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user.username}</span>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 px-4 py-2 rounded-lg hover:bg-opacity-30 transition font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Side Navigation */}
      <div className="flex">
        <aside className="w-64 bg-white shadow-lg min-h-screen">
          <nav className="p-4">
            {getNavItems().map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition font-semibold flex items-center gap-3 ${
                  activeTab === item.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* DASHBOARD TAB */}
 {activeTab === 'dashboard' && (
  <div>
    {user.role === 'tenant' ? (
      <TenantDashboard />
    ) : (
      <div>
        <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-2">🏢</div>
            <div className="text-3xl font-bold">{stats.total_properties || 0}</div>
            <div className="text-blue-100">Properties</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-2">🏠</div>
            <div className="text-3xl font-bold">{stats.total_units || 0}</div>
            <div className="text-green-100">Units ({stats.occupied_units || 0} occupied)</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-2">👥</div>
            <div className="text-3xl font-bold">{stats.active_tenants || 0}</div>
            <div className="text-purple-100">Active Tenants</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-xl shadow-lg">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.total_monthly_rent || 0)}
            </div>
            <div className="text-yellow-100">Monthly Revenue</div>
          </div>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">💵 Total Revenue Collected</h3>
          <p className="text-4xl font-bold text-green-600">
            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(stats.total_revenue || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-2">All-time revenue from rent payments</p>
        </div>
      </div>
    )}
  </div>
)}


          {/* PROPERTIES TAB */}
          {activeTab === 'properties' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Properties</h2>
                <button
                  onClick={() => setShowPropertyForm(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  + Add Property
                </button>
              </div>

              {properties.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No properties yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map(property => (
                    <div key={property.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                      <h3 className="text-xl font-bold mb-2">{property.name}</h3>
                      <p className="text-gray-600 mb-4">📍 {property.location}</p>
                      {property.description && (
                        <p className="text-sm text-gray-500 mb-4">{property.description}</p>
                      )}
<div className="flex gap-2">
  <button
    onClick={() => handleEditProperty(property)}
    className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition font-semibold"
  >
    ✏️ Edit
  </button>
  <button
    onClick={() => handleDeleteProperty(property.id)}
    className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition font-semibold"
  >
    🗑️ Delete
  </button>
</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* UNITS TAB */}
{activeTab === 'units' && (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Units</h2>

      <div className="flex gap-3">
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('http://localhost:5000/api/units/sync-status', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              alert(`✅ ${data.message}`);  // ✅ CORRECT - parenthesis with backtick inside
              fetchUnits();
              fetchDashboardStats();
            } catch (error) {
              alert('Error syncing: ' + error.message);
            }
          }}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
        >
          🔄 Sync Status
        </button>

        <button
          onClick={() => setShowUnitForm(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          + Add Unit
        </button>
      </div>

    </div>


              {units.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No units yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Unit</th>
                        <th className="px-6 py-3 text-left">Property</th>
                        <th className="px-6 py-3 text-left">Rent</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map(unit => (
                        <tr key={unit.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold">{unit.name}</td>
                          <td className="px-6 py-4">{unit.property_name}</td>
                          <td className="px-6 py-4">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(unit.rent_amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              unit.status === 'vacant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {unit.status}
                            </span>
                          </td>
<td className="px-6 py-4">
  <div className="flex gap-3">
    <button
      onClick={() => handleEditUnit(unit)}
      className="text-blue-600 hover:text-blue-800 font-semibold"
    >
      ✏️ Edit
    </button>
    <button
      onClick={() => handleDeleteUnit(unit.id)}
      className="text-red-600 hover:text-red-800 font-semibold"
    >
      🗑️ Delete
    </button>
  </div>
</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TENANTS TAB */}
{activeTab === 'tenants' && (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Tenants</h2>
      <div className="flex gap-3">
        <button
          onClick={handleSendRentReminders}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
          title="Send SMS reminders to tenants with arrears"
        >
          <span className="text-xl">📱</span> Send Rent Reminders
        </button>
        <button
          onClick={() => setShowTenantForm(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
          + Add Tenant
        </button>
      </div>
    </div>

              {tenants.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No tenants yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">Phone</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map(tenant => (
                        <tr key={tenant.tenant_id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold">{tenant.full_name}</td>
                          <td className="px-6 py-4">{tenant.email}</td>
                          <td className="px-6 py-4">{tenant.phone}</td>
<td className="px-6 py-4">
  <div className="flex gap-3">
    <button
      onClick={() => handleEditTenant(tenant)}
      className="text-blue-600 hover:text-blue-800 font-semibold"
    >
      ✏️ Edit
    </button>
    <button
      onClick={() => handleResetTenantPassword(tenant.tenant_id, tenant.email)}
      className="text-green-600 hover:text-green-800 font-semibold"
      title="Reset Password"
    >
      🔑 Reset
    </button>
    <button
      onClick={() => handleDeleteTenant(tenant.tenant_id)}
      className="text-red-600 hover:text-red-800 font-semibold"
    >
      🗑️ Delete
    </button>
  </div>
</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* LEASE MANAGEMENT TAB */}
          {activeTab === 'leases' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Lease Management</h2>
                <button
                  onClick={() => setShowLeaseForm(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center gap-2"
                >
                  <span className="text-xl">+</span> Create New Lease
                </button>
              </div>

              {leases.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-500 text-lg mb-2">No lease agreements yet</p>
                  <p className="text-sm text-gray-400">Create your first lease to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {leases.map((lease) => (
                    <div key={lease.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-200">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{lease.tenant_name}</h3>
                            <p className="text-gray-600">{lease.unit_name} • {lease.property_name}</p>
                            <p className="text-sm text-gray-500 mt-1">{lease.tenant_email}</p>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                            lease.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            lease.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            lease.status === 'viewed' ? 'bg-purple-100 text-purple-700' :
                            lease.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            lease.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            lease.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {lease.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Start Date</p>
                            <p className="font-semibold text-gray-800">{new Date(lease.start_date).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">End Date</p>
                            <p className="font-semibold text-gray-800">{new Date(lease.end_date).toLocaleDateString('en-GB')}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-green-600 mb-1">Monthly Rent</p>
                            <p className="font-bold text-green-700 text-lg">
                              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(lease.rent_amount)}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-xs text-blue-600 mb-1">Deposit</p>
                            <p className="font-bold text-blue-700 text-lg">
                              {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(lease.deposit_amount)}
                            </p>
                          </div>
                        </div>

                        {lease.status === 'sent' && lease.sent_at && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-blue-800">
                              📤 Sent to tenant on {new Date(lease.sent_at).toLocaleString('en-GB')}
                            </p>
                          </div>
                        )}

                        {lease.status === 'viewed' && lease.viewed_at && (
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-purple-800">
                              👁️ Viewed by tenant on {new Date(lease.viewed_at).toLocaleString('en-GB')}
                            </p>
                          </div>
                        )}

                        {lease.status === 'accepted' && lease.tenant_signature && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-green-800 font-semibold">
                              ✓ Signed by {lease.tenant_signature} on {new Date(lease.tenant_signed_at).toLocaleString('en-GB')}
                            </p>
                          </div>
                        )}

                        {lease.status === 'rejected' && lease.rejection_reason && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm font-semibold text-red-800 mb-1">❌ Rejected</p>
                            <p className="text-sm text-red-700">{lease.rejection_reason}</p>
                          </div>
                        )}

<div className="flex gap-3 pt-4 border-t">
  {lease.status === 'draft' && (
    <>
      <button
        onClick={() => handleEditLease(lease)}
        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
      >
        <span className="text-lg">✏️</span> Edit
      </button>
      <button
        onClick={() => handleSendLease(lease.id)}
        className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center gap-2"
      >
        <span className="text-lg">📤</span> Send to Tenant
      </button>
    </>
  )}
                          
  {['sent', 'viewed', 'accepted'].includes(lease.status) && (
    <button
      onClick={() => {
        setSelectedLease(lease);
        setShowLeasePreview(true);
      }}
      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
    >
      <span className="text-lg">👁️</span> View Details
    </button>
  )}

  {/* ADD THIS NEW TERMINATE BUTTON */}
  {lease.status === 'active' && ['admin', 'landlord'].includes(user.role) && (
    <button
      onClick={() => {
        const reason = prompt('Please enter termination reason (minimum 10 characters):');
        if (reason && reason.length >= 10) {
          handleTerminateLease(lease.id, reason);
        } else if (reason) {
          alert('⚠️ Reason must be at least 10 characters');
        }
      }}
      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2"
    >
      <span className="text-lg">❌</span> Terminate Lease
    </button>
  )}

  <button
    onClick={() => handleDeleteLease(lease.id)}
    className="bg-red-100 text-red-700 px-6 py-3 rounded-lg hover:bg-red-200 transition font-semibold flex items-center justify-center gap-2"
  >
    <span className="text-lg">🗑️</span> Delete
  </button>
</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MY LEASES TAB (Tenant) */}
          {activeTab === 'my-leases' && (
            <TenantLeases />
          )}

          {/* PAYMENTS TAB */}
{activeTab === 'payments' && (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Payments</h2>
      
      {/* TENANT: Pay Rent Button */}
{user.role === 'tenant' && (
  <button
    onClick={() => {
      // Debug logs
      console.log('🔍 FULL USER OBJECT:', user);
      console.log('🔍 user.tenant_id:', user.tenant_id);
      console.log('🔍 user.phone:', user.phone);
      console.log('🔍 user.email:', user.email);
      
      // Find active lease
      const activeLease = leases.find(l => {
        const match = l.status === 'active' && l.tenant_id === user.tenant_id;
        console.log(`Lease ${l.id}: tenant_id=${l.tenant_id}, user.tenant_id=${user.tenant_id}, match=${match}`);
        return match;
      });
      
      console.log('FOUND LEASE:', activeLease);
      
      if (!activeLease) {
        alert('ERROR: No active lease found\n\n' +
              'User tenant_id: ' + user.tenant_id + '\n' +
              'User email: ' + user.email + '\n\n' +
              'Check console for details');
        return;
      }
      
      const formData = {
        phone: user.phone || '',
        amount: String(activeLease.rent_amount),
        lease_id: String(activeLease.id)
      };
      
      console.log('FORM DATA:', formData);
      
      setMpesaForm(formData);
      setShowMpesaModal(true);
    }}
    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
  >
    <span className="text-xl">💰</span> Pay Rent via M-PESA
  </button>
)}
      
      {/* LANDLORD/ADMIN: Reminders & Record Payment */}
      {['admin', 'landlord'].includes(user.role) && (
        <div className="flex gap-3">
          <button
            onClick={handleSendRentReminders}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
            title="Send SMS reminders to tenants with arrears"
          >
            <span className="text-xl">📱</span> Send Reminders
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
          >
            + Record Payment
          </button>
        </div>
      )}
    </div>

              {payments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No payments yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Tenant</th>
                        <th className="px-6 py-3 text-left">Unit</th>
                        <th className="px-6 py-3 text-left">Amount</th>
                        <th className="px-6 py-3 text-left">Method</th>
                        {user.role === 'admin' && <th className="px-6 py-3 text-left">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(payment => (
                        <tr key={payment.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4">{new Date(payment.payment_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 font-semibold">{payment.tenant_name}</td>
                          <td className="px-6 py-4">{payment.unit_name}</td>
                          <td className="px-6 py-4 text-green-600 font-bold">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(payment.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              {payment.payment_method || 'cash'}
                            </span>
                          </td>
                          {user.role === 'admin' && (
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-red-600 hover:text-red-800 font-semibold"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === 'expenses' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Expenses</h2>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  + Add Expense
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No expenses yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Property</th>
                        <th className="px-6 py-3 text-left">Category</th>
                        <th className="px-6 py-3 text-left">Description</th>
                        <th className="px-6 py-3 text-left">Amount</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(expense => (
                        <tr key={expense.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4">{new Date(expense.expense_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 font-semibold">{expense.property_name}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">{expense.description}</td>
                          <td className="px-6 py-4 text-red-600 font-bold">
                            {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(expense.amount)}
                          </td>
<td className="px-6 py-4">
  <div className="flex gap-3">
    <button
      onClick={() => handleEditExpense(expense)}
      className="text-blue-600 hover:text-blue-800 font-semibold"
    >
      ✏️ Edit
    </button>
    <button
      onClick={() => handleDeleteExpense(expense.id)}
      className="text-red-600 hover:text-red-800 font-semibold"
    >
      🗑️ Delete
    </button>
  </div>
</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Maintenance Requests</h2>
                <button
                  onClick={() => setShowMaintenanceForm(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  + Create Request
                </button>
              </div>

              {maintenance.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No maintenance requests yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-left">Unit</th>
                        <th className="px-6 py-3 text-left">Title</th>
                        <th className="px-6 py-3 text-left">Priority</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        {['admin', 'landlord'].includes(user.role) && <th className="px-6 py-3 text-left">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {maintenance.map(request => (
                        <tr key={request.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4">{new Date(request.reported_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 font-semibold">{request.unit_name}</td>
                          <td className="px-6 py-4">{request.title}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              request.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {request.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'completed' ? 'bg-green-100 text-green-700' :
                              request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {request.status}
                            </span>
                          </td>
{['admin', 'landlord'].includes(user.role) && (
  <td className="px-6 py-4">
    <div className="flex gap-3">
      <button
        onClick={() => handleEditMaintenance(request)}
        className="text-blue-600 hover:text-blue-800 font-semibold"
      >
        ✏️ Edit
      </button>
      <button
        onClick={() => handleDeleteMaintenance(request.id)}
        className="text-red-600 hover:text-red-800 font-semibold"
      >
        🗑️ Delete
      </button>
    </div>
  </td>
)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Users</h2>
                <button
                  onClick={() => setShowUserForm(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  + Add User
                </button>
              </div>

              {users.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500 text-lg">No users yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-indigo-600 text-white">
                      <tr>
                        <th className="px-6 py-3 text-left">Username</th>
                        <th className="px-6 py-3 text-left">Email</th>
                        <th className="px-6 py-3 text-left">Role</th>
                        <th className="px-6 py-3 text-left">Status</th>
                        <th className="px-6 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 font-semibold">{u.username}</td>
                          <td className="px-6 py-4">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-800 font-semibold"
                              disabled={u.id === user.id}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
  <Reports />
)}

{/* SMS TAB */}
{activeTab === 'sms' && (
  <div>
    <h2 className="text-3xl font-bold mb-6">SMS Rent Reminders</h2>
    
    {/* SMS Balance Card - ADD THIS ENTIRE SECTION */}
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-green-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-5xl">💳</div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">SMS Credits</h3>
            <p className="text-sm text-gray-600">Check your BongaSMS balance</p>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await fetch('http://localhost:5000/api/sms/balance', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await response.json();
              if (data.success) {
                alert(`💳 SMS Credits: ${data.balance}\n\nAccount: ${data.clientName}`);
              } else {
                alert('Error: ' + data.error);
              }
            } catch (error) {
              alert('Error checking balance: ' + error.message);
            }
          }}

          
          
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
        >
          Check Balance
        </button>
      </div>
    </div>
    {/* SMS Balance Card ENDS */}


{/* M-PESA TRANSACTIONS TAB */}
{activeTab === 'mpesa' && (
  <div>
    <h2 className="text-3xl font-bold mb-6">💳 M-PESA Transactions</h2>
    
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-green-600 text-white">
          <tr>
            <th className="px-6 py-3 text-left">Date</th>
            <th className="px-6 py-3 text-left">Tenant</th>
            <th className="px-6 py-3 text-left">Phone</th>
            <th className="px-6 py-3 text-left">Amount</th>
            <th className="px-6 py-3 text-left">Receipt</th>
            <th className="px-6 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
              No M-PESA transactions yet. Transactions will appear here once tenants make payments.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}

    
    {/* Send Bulk Rent Reminders Card - YOUR EXISTING CODE CONTINUES HERE */}
    <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">📱</div>
        <div>
          <h3 className="text-2xl font-bold text-gray-800">Send Bulk Rent Reminders</h3>
          <p className="text-gray-600">Send SMS notifications to all tenants with outstanding rent balances</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-indigo-600 mb-6">
        <h4 className="font-bold text-gray-800 mb-2">ℹ️ How it works:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Automatically calculates arrears for each tenant</li>
          <li>• Sends personalized SMS to tenants with outstanding balances</li>
          <li>• Skips tenants without phone numbers</li>
          <li>• Shows detailed results after sending</li>
        </ul>
      </div>

      <button
        onClick={handleSendRentReminders}
        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
      >
        <span className="text-2xl">📱</span> Send Rent Reminders to All Tenants
      </button>

      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Note:</strong> SMS functionality requires configuration of SMS API credentials. 
          Currently in simulation mode - check backend console for logs.
        </p>
      </div>
    </div>

    <div className="bg-white rounded-xl shadow-lg p-8">
      <h3 className="text-xl font-bold mb-4">SMS Message Template</h3>
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700 font-mono">
          Dear [Tenant Name], you have an outstanding rent balance of KES [Amount] for [Unit Name]. 
          Please make payment at your earliest convenience. Thank you - [Property Name] Management
        </p>
      </div>
    </div>
  </div>
)}
```

        </main>
      </div>

      {/* MODALS - Continue in next message due to length */}
{/* Property Form Modal */}
      {showPropertyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
<h3 className="text-2xl font-bold mb-4">{editingProperty ? '✏️ Edit Property' : '➕ Add Property'}</h3>
            <form onSubmit={handleCreateProperty}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Property Name *</label>
                <input
                  type="text"
                  value={propertyForm.name}
                  onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Location *</label>
                <input
                  type="text"
                  value={propertyForm.location}
                  onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Create
                </button>
<button
  type="button"
  onClick={() => {
    setShowPropertyForm(false);
    setEditingProperty(null);
    setPropertyForm({ name: '', location: '', description: '' });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Form Modal */}
      {showUnitForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
<h3 className="text-2xl font-bold mb-4">{editingUnit ? '✏️ Edit Unit' : '➕ Add Unit'}</h3>
            <form onSubmit={handleCreateUnit}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Property *</label>
                <select
                  value={unitForm.property_id}
                  onChange={(e) => setUnitForm({ ...unitForm, property_id: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Property</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Unit Name *</label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  placeholder="e.g., Unit A1"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Monthly Rent (KES) *</label>
                <input
                  type="number"
                  value={unitForm.rent_amount}
                  onChange={(e) => setUnitForm({ ...unitForm, rent_amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Deposit Amount (KES)</label>
                <input
                  type="number"
                  value={unitForm.deposit_amount}
                  onChange={(e) => setUnitForm({ ...unitForm, deposit_amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-3">
<button
  type="submit"
  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
>
  {editingTenant ? 'Update' : 'Create'}
</button>

<button
  type="button"
  onClick={() => {
    setShowUnitForm(false);
    setEditingUnit(null);
    setUnitForm({ property_id: '', name: '', rent_amount: '', deposit_amount: '', bedrooms: 1, bathrooms: 1 });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Form Modal */}
      {showTenantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
<h3 className="text-2xl font-bold mb-4">{editingTenant ? '✏️ Edit Tenant' : '➕ Add Tenant'}</h3>
            <form onSubmit={handleCreateTenant}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input
                  type="text"
                  value={tenantForm.full_name}
                  onChange={(e) => setTenantForm({ ...tenantForm, full_name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input
                  type="tel"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Create
                </button>
<button
  type="button"
  onClick={() => {
    setShowTenantForm(false);
    setEditingTenant(null);
    setTenantForm({ full_name: '', email: '', phone: '', id_number: '', emergency_contact: '', emergency_phone: '' });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lease Form Modal */}
      {showLeaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
<h3 className="text-2xl font-bold mb-4">{editingLease ? '✏️ Edit Lease' : '➕ Create Lease'}</h3>
            <form onSubmit={handleCreateLease}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Tenant *</label>
                <select
                  value={leaseForm.tenant_id}
                  onChange={(e) => setLeaseForm({ ...leaseForm, tenant_id: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.full_name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Unit *</label>
                <select
                  value={leaseForm.unit_id}
                  onChange={handleUnitSelection}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Unit</option>
                  {units.filter(u => u.status === 'vacant').map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.property_name} (KES {u.rent_amount})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Start Date *</label>
                <input
                  type="date"
                  value={leaseForm.start_date}
                  onChange={(e) => setLeaseForm({ ...leaseForm, start_date: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">End Date *</label>
                <input
                  type="date"
                  value={leaseForm.end_date}
                  onChange={(e) => setLeaseForm({ ...leaseForm, end_date: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Monthly Rent (KES) *</label>
                <input
                  type="number"
                  value={leaseForm.rent_amount}
                  onChange={(e) => setLeaseForm({ ...leaseForm, rent_amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Deposit Amount (KES)</label>
                <input
                  type="number"
                  value={leaseForm.deposit_amount}
                  onChange={(e) => setLeaseForm({ ...leaseForm, deposit_amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Create
                </button>
<button
  type="button"
  onClick={() => {
    setShowLeaseForm(false);
    setEditingLease(null);
    setLeaseForm({ tenant_id: '', unit_id: '', start_date: '', end_date: '', rent_amount: '', deposit_amount: '' });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">Record Payment</h3>
            <form onSubmit={handleCreatePayment}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Lease *</label>
                <select
                  value={paymentForm.lease_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, lease_id: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Lease</option>
                  {leases.filter(l => ['active'].includes(l.status)).map(l => (
                    <option key={l.id} value={l.id}>
                      {l.tenant_name} - {l.unit_name} (KES {l.rent_amount})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Amount (KES) *</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Payment Method *</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="mpesa">M-PESA</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Record
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
<h3 className="text-2xl font-bold mb-4">{editingExpense ? '✏️ Edit Expense' : '➕ Add Expense'}</h3>
            <form onSubmit={handleCreateExpense}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Property *</label>
                <select
                  value={expenseForm.property_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, property_id: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Property</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="repairs">Repairs</option>
                  <option value="utilities">Utilities</option>
                  <option value="insurance">Insurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="management">Management</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Amount (KES) *</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Expense Date *</label>
                <input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Record
                </button>
<button
  type="button"
  onClick={() => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    setExpenseForm({ property_id: '', category: 'maintenance', description: '', amount: '', expense_date: '', vendor: '' });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
<h3 className="text-2xl font-bold mb-4">{editingMaintenance ? '✏️ Edit Maintenance Request' : '➕ Create Maintenance Request'}</h3>
            <form onSubmit={handleCreateMaintenance}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Unit *</label>
                <select
                  value={maintenanceForm.unit_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, unit_id: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="">Select Unit</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.property_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Title *</label>
                <input
                  type="text"
                  value={maintenanceForm.title}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  placeholder="e.g., Broken sink"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Description *</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  rows="3"
                  placeholder="Detailed description of the issue"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Priority *</label>
                <select
                  value={maintenanceForm.priority}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, priority: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Create
                </button>
<button
  type="button"
  onClick={() => {
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
    setMaintenanceForm({ unit_id: '', title: '', description: '', priority: 'medium' });
  }}
  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
>
  Cancel
</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold mb-4">Add User</h3>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Username *</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Password *</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Role *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  required
                >
                  <option value="tenant">Tenant</option>
                  <option value="landlord">Landlord</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lease Preview Modal */}
      {showLeasePreview && selectedLease && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Lease Agreement Preview</h2>
              <button
                onClick={() => {
                  setShowLeasePreview(false);
                  setSelectedLease(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center border-b pb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">LEASE AGREEMENT</h1>
                <p className="text-gray-600">Spiraldart Technologies</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-3">LANDLORD</h3>
                  <p className="text-gray-600">Spiraldart Technologies</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedLease.property_name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-3">TENANT</h3>
                  <p className="text-gray-600 font-semibold">{selectedLease.tenant_name}</p>
                  <p className="text-sm text-gray-500">{selectedLease.tenant_email}</p>
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-600">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">PROPERTY DETAILS</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-semibold text-gray-800">{selectedLease.property_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit</p>
                    <p className="font-semibold text-gray-800">{selectedLease.unit_name}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-600">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">LEASE TERMS</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-semibold text-gray-800">{new Date(selectedLease.start_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-semibold text-gray-800">{new Date(selectedLease.end_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rent</p>
                    <p className="font-bold text-green-700 text-xl">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(selectedLease.rent_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Security Deposit</p>
                    <p className="font-bold text-blue-700 text-xl">
                      {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(selectedLease.deposit_amount)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 mb-4 text-lg">TERMS & CONDITIONS</h3>
                <div className="bg-gray-50 p-6 rounded-lg space-y-3 text-sm text-gray-700">
                  <p><strong>1. Rent Payment:</strong> Rent is due on the 1st of each month. Late payments may incur penalties.</p>
                  <p><strong>2. Security Deposit:</strong> Refundable upon lease termination, subject to property inspection.</p>
                  <p><strong>3. Maintenance:</strong> Tenant responsible for maintaining property in good condition.</p>
                  <p><strong>4. Modifications:</strong> Any property modifications require written landlord approval.</p>
                  <p><strong>5. Termination:</strong> 30 days written notice required from either party.</p>
                  <p><strong>6. Utilities:</strong> Tenant responsible for electricity, water, and internet bills.</p>
                  <p><strong>7. Subletting:</strong> Not permitted without landlord's written consent.</p>
                </div>
              </div>

              {selectedLease.tenant_signature && (
                <div className="border-t pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Tenant Signature</p>
                      <div className="border-b-2 border-gray-300 pb-2">
                        <p className="font-bold text-gray-800">{selectedLease.tenant_signature}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Signed on {new Date(selectedLease.tenant_signed_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3">
              <button
                onClick={() => {
                  setShowLeasePreview(false);
                  setSelectedLease(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* M-PESA Payment Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">💰 Pay via M-PESA</h3>
              <button
                onClick={() => {
                  setShowMpesaModal(false);
                  setMpesaStatus(null);
                  setMpesaForm({ phone: '', amount: '', lease_id: '' });
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

{mpesaStatus && (
  <div className={`p-4 rounded-lg mb-4 ${
    mpesaStatus.type === 'success' ? 'bg-green-100 border-2 border-green-500' :
    mpesaStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
    mpesaStatus.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
    'bg-blue-50 border border-blue-200'
  }`}>
    <p className={`text-sm whitespace-pre-line ${
      mpesaStatus.type === 'success' ? 'text-green-800 font-bold text-base' :
      mpesaStatus.type === 'error' ? 'text-red-800' :
      mpesaStatus.type === 'warning' ? 'text-yellow-800' :
      'text-blue-800'
    }`}>
      {mpesaStatus.message}
    </p>
                {mpesaStatus.type === 'loading' && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Processing...</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleMpesaPayment}>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={mpesaForm.phone}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, phone: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0712345678 or 254712345678"
                  required
                  disabled={mpesaStatus?.type === 'loading'}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the M-PESA number to receive payment prompt</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Amount (KES) *</label>
                <input
                  type="number"
                  value={mpesaForm.amount}
                  onChange={(e) => setMpesaForm({ ...mpesaForm, amount: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="10"
                  min="1"
                  required
                  disabled={mpesaStatus?.type === 'loading'}
                />
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded">
                <p className="text-sm text-green-800">
                  <strong>How it works:</strong>
                </p>
                <ol className="text-xs text-green-700 mt-2 space-y-1 ml-4 list-decimal">
                  <li>Click "Send Payment Request"</li>
                  <li>Check your phone for M-PESA prompt</li>
                  <li>Enter your M-PESA PIN</li>
                  <li>Payment will be recorded automatically</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={mpesaStatus?.type === 'loading'}
                >
                  {mpesaStatus?.type === 'loading' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>📱 Send Payment Request</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMpesaModal(false);
                    setMpesaStatus(null);
                    setMpesaForm({ phone: '', amount: '', lease_id: '' });
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                  disabled={mpesaStatus?.type === 'loading'}
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Powered by M-PESA | Paybill: 4182789
              </p>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;