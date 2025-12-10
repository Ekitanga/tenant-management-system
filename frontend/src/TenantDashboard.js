import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function TenantDashboard() {
  const [stats, setStats] = useState(null);
  const [currentLease, setCurrentLease] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Fetch stats
      const statsRes = await axios.get(`${API_URL}/dashboard/stats`, config);
      setStats(statsRes.data.stats);

      // Fetch leases
      const leasesRes = await axios.get(`${API_URL}/leases`, config);
      const activeLease = leasesRes.data.leases.find(l => l.status === 'active');
      
      if (activeLease) {
        setCurrentLease(activeLease);
      }

      // Fetch payments
      const paymentsRes = await axios.get(`${API_URL}/payments`, config);
      setPayments(paymentsRes.data.payments);

      setLoading(false);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const calculateBalance = () => {
    if (!currentLease || !stats) return 0;
    
    const startDate = new Date(currentLease.start_date);
    const today = new Date();
    
    // Calculate months elapsed (more accurate)
    const monthsElapsed = Math.max(0, 
      (today.getFullYear() - startDate.getFullYear()) * 12 + 
      (today.getMonth() - startDate.getMonth()) + 
      (today.getDate() >= startDate.getDate() ? 1 : 0)
    );
    
    const expectedAmount = monthsElapsed * currentLease.rent_amount;
    const totalPaid = stats.tenant_total_paid || 0;
    const balance = expectedAmount - totalPaid;
    
    return balance > 0 ? balance : 0;
  };

  const getNextPaymentDue = () => {
    if (!currentLease) return null;
    
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-6xl mb-4">⏳</div>
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">🏠 My Dashboard</h1>
        <p className="text-blue-100">Welcome to your tenant portal</p>
      </div>

      {/* Current Lease Card */}
      {currentLease ? (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">📋 Current Lease</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Property</p>
              <p className="text-lg font-bold text-gray-800">{currentLease.property_name}</p>
              <p className="text-sm text-gray-500">{currentLease.property_location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Unit</p>
              <p className="text-lg font-bold text-gray-800">{currentLease.unit_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(currentLease.rent_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Lease Period</p>
              <p className="text-lg font-bold text-gray-800">
                {formatDate(currentLease.start_date)} - {formatDate(currentLease.end_date)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-700">No active lease found</p>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-green-100 text-sm mb-1">Total Paid</p>
          <p className="text-3xl font-bold">{formatCurrency(stats?.tenant_total_paid || 0)}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-100 text-sm mb-1">Balance Due</p>
          <p className="text-3xl font-bold">{formatCurrency(calculateBalance())}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-blue-100 text-sm mb-1">Next Payment Due</p>
          <p className="text-xl font-bold">
            {getNextPaymentDue() ? formatDate(getNextPaymentDue()) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
          <h2 className="text-2xl font-bold">💳 Payment History</h2>
        </div>
        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Method</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Reference</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{formatDate(payment.payment_date)}</td>
                    <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4 capitalize">{payment.payment_method}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.reference_number || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">💳</div>
            <p className="text-xl">No payment history yet</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-2">Active Leases</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.tenant_leases || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500">
          <p className="text-sm text-gray-600 mb-2">Maintenance Requests</p>
          <p className="text-3xl font-bold text-orange-600">{stats?.tenant_maintenance || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default TenantDashboard;