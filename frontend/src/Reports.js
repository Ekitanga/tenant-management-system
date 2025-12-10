import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function Reports() {
  const [activeReport, setActiveReport] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [summaryData, setSummaryData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [arrearsData, setArrearsData] = useState(null);

 useEffect(() => {
  console.log('📊 Reports component mounted/updated');
  console.log('Active report:', activeReport);
  console.log('Date range:', dateRange);
  fetchReports();
}, [activeReport, dateRange]);

const fetchReports = async () => {
  setLoading(true);
  console.log(`📊 Fetching ${activeReport} report...`);
  
  try {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    switch (activeReport) {
      case 'summary':
        console.log('📊 Requesting summary from:', `${API_URL}/reports/summary`);
        const summary = await axios.get(`${API_URL}/reports/summary`, config);
        console.log('📊 Summary response:', summary.data);
        setSummaryData(summary.data);
        break;
        
      case 'revenue':
        const revenueUrl = `${API_URL}/reports/revenue?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        console.log('📊 Requesting revenue from:', revenueUrl);
        const revenue = await axios.get(revenueUrl, config);
        console.log('📊 Revenue response:', revenue.data);
        setRevenueData(revenue.data);
        break;
        
      case 'occupancy':
        console.log('📊 Requesting occupancy from:', `${API_URL}/reports/occupancy`);
        const occupancy = await axios.get(`${API_URL}/reports/occupancy`, config);
        console.log('📊 Occupancy response:', occupancy.data);
        setOccupancyData(occupancy.data);
        break;
        
      case 'expenses':
        const expensesUrl = `${API_URL}/reports/expenses?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        console.log('📊 Requesting expenses from:', expensesUrl);
        const expenses = await axios.get(expensesUrl, config);
        console.log('📊 Expenses response:', expenses.data);
        setExpenseData(expenses.data);
        break;
        
      case 'arrears':
        console.log('📊 Requesting arrears from:', `${API_URL}/reports/arrears`);
        const arrears = await axios.get(`${API_URL}/reports/arrears`, config);
        console.log('📊 Arrears response:', arrears.data);
        console.log('📊 Arrears count:', arrears.data?.arrears?.length || 0);
        console.log('📊 Total arrears:', arrears.data?.summary?.totalArrears || 0);
        setArrearsData(arrears.data);
        break;
        
      default:
        console.warn('📊 Unknown report type:', activeReport);
        break;
    }
    
    console.log('📊 Report fetch complete:', activeReport);
    
  } catch (error) {
    console.error('❌ Report fetch error:', error);
    console.error('❌ Error details:', error.response?.data || error.message);
  } finally {
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

  const reportTabs = [
    { key: 'summary', label: 'Summary', icon: '📊' },
    { key: 'revenue', label: 'Revenue', icon: '💰' },
    { key: 'occupancy', label: 'Occupancy', icon: '🏠' },
    { key: 'expenses', label: 'Expenses', icon: '💸' },
    { key: 'arrears', label: 'Arrears', icon: '⚠️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Reports & Analytics</h1>
              <p className="text-gray-600">Comprehensive insights into your property management</p>
            </div>
            {activeReport !== 'summary' && activeReport !== 'occupancy' && activeReport !== 'arrears' && (
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {reportTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveReport(tab.key)}
                className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${
                  activeReport === tab.key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-xl mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-xl text-gray-600">Loading report...</p>
          </div>
        ) : (
          <>
            {/* SUMMARY REPORT */}
            {activeReport === 'summary' && summaryData && summaryData.revenue && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-4xl">💰</div>
                      <div className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">Last 30 Days</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{formatCurrency(summaryData.revenue.last30Days)}</div>
                    <div className="text-green-100">Revenue</div>
                  </div>

                  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-4xl">💸</div>
                      <div className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">Last 30 Days</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{formatCurrency(summaryData.expenses.last30Days)}</div>
                    <div className="text-red-100">Expenses</div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-4xl">📈</div>
                      <div className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">Net Profit</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{formatCurrency(summaryData.revenue.netProfit)}</div>
                    <div className="text-blue-100">Total Profit</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-4xl">🏠</div>
                      <div className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">Occupancy</div>
                    </div>
                    <div className="text-3xl font-bold mb-1">{summaryData.occupancy.rate}%</div>
                    <div className="text-purple-100">{summaryData.occupancy.occupiedUnits}/{summaryData.occupancy.totalUnits} Units</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 mb-2">Total Revenue (All Time)</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(summaryData.revenue.total)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-500">
                    <p className="text-sm text-gray-600 mb-2">Total Expenses (All Time)</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(summaryData.expenses.total)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 mb-2">Active Tenants</p>
                    <p className="text-3xl font-bold text-purple-600">{summaryData.activeTenants}</p>
                  </div>
                </div>
              </div>
            )}

            {/* REVENUE REPORT */}
            {activeReport === 'revenue' && revenueData && revenueData.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(revenueData.summary.totalRevenue)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-2">Total Payments</p>
                    <p className="text-3xl font-bold text-blue-600">{revenueData.summary.totalPayments}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 mb-2">Avg Monthly Revenue</p>
                    <p className="text-3xl font-bold text-purple-600">{formatCurrency(revenueData.summary.averageMonthlyRevenue)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                    <h2 className="text-2xl font-bold">Monthly Revenue Breakdown</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Month</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Revenue</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Payments</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Avg Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.monthlyRevenue.map((month, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-semibold">{month.month}</td>
                            <td className="px-6 py-4 text-green-600 font-bold">{formatCurrency(month.revenue)}</td>
                            <td className="px-6 py-4">{month.payment_count}</td>
                            <td className="px-6 py-4">{formatCurrency(month.avg_payment)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* OCCUPANCY REPORT */}
            {activeReport === 'occupancy' && occupancyData && occupancyData.overall && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500">
                    <p className="text-sm text-gray-600 mb-2">Total Units</p>
                    <p className="text-3xl font-bold text-blue-600">{occupancyData.overall.total_units}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500">
                    <p className="text-sm text-gray-600 mb-2">Occupied</p>
                    <p className="text-3xl font-bold text-green-600">{occupancyData.overall.occupied_units}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-2">Vacant</p>
                    <p className="text-3xl font-bold text-orange-600">{occupancyData.overall.vacant_units}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-purple-500">
                    <p className="text-sm text-gray-600 mb-2">Occupancy Rate</p>
                    <p className="text-3xl font-bold text-purple-600">{occupancyData.overall.occupancy_rate}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
                    <h2 className="text-2xl font-bold">Occupancy by Property</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Property</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Location</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total Units</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Occupied</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Vacant</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {occupancyData.byProperty.map((prop) => (
                          <tr key={prop.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-semibold">{prop.property_name}</td>
                            <td className="px-6 py-4">{prop.location}</td>
                            <td className="px-6 py-4">{prop.total_units}</td>
                            <td className="px-6 py-4 text-green-600 font-bold">{prop.occupied_units}</td>
                            <td className="px-6 py-4 text-orange-600 font-bold">{prop.vacant_units}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-purple-600 h-2 rounded-full"
                                    style={{ width: `${prop.occupancy_rate}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold text-purple-600">{prop.occupancy_rate}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {occupancyData.vacantUnits.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
                      <h2 className="text-2xl font-bold">Vacant Units Available</h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {occupancyData.vacantUnits.map((unit) => (
                          <div key={unit.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-500 transition">
                            <h3 className="font-bold text-lg mb-2">{unit.unit_number}</h3>
                            <p className="text-sm text-gray-600 mb-3">{unit.property_name}</p>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-500">Rent</span>
                              <span className="font-bold text-green-600">{formatCurrency(unit.rent_amount)}</span>
                            </div>
                            <div className="flex gap-3 text-sm text-gray-600">
                              <span>🛏️ {unit.bedrooms} BR</span>
                              <span>🚿 {unit.bathrooms} BA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EXPENSE REPORT */}
            {activeReport === 'expenses' && expenseData && expenseData.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-500">
                    <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(expenseData.summary.totalExpenses)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-2">Number of Expenses</p>
                    <p className="text-3xl font-bold text-orange-600">{expenseData.summary.expenseCount}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 text-white">
                    <h2 className="text-2xl font-bold">Expenses by Category</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Category</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Count</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total Amount</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Average</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseData.categoryBreakdown.map((cat, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-semibold capitalize">{cat.category}</td>
                            <td className="px-6 py-4">{cat.count}</td>
                            <td className="px-6 py-4 text-red-600 font-bold">{formatCurrency(cat.total_amount)}</td>
                            <td className="px-6 py-4">{formatCurrency(cat.avg_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white">
                    <h2 className="text-2xl font-bold">Recent Expenses</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Property</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Category</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Description</th>
                          <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseData.expenses.slice(0, 20).map((exp) => (
                          <tr key={exp.id} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-4">{formatDate(exp.expense_date)}</td>
                            <td className="px-6 py-4">{exp.property_name}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold capitalize">
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">{exp.description}</td>
                            <td className="px-6 py-4 text-red-600 font-bold">{formatCurrency(exp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ARREARS REPORT */}
            {activeReport === 'arrears' && arrearsData && arrearsData.summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-500">
                    <p className="text-sm text-gray-600 mb-2">Total Arrears</p>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(arrearsData.summary.totalArrears)}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500">
                    <p className="text-sm text-gray-600 mb-2">Tenants in Arrears</p>
                    <p className="text-3xl font-bold text-orange-600">{arrearsData.summary.tenantsInArrears}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-600 mb-2">Average Arrears</p>
                    <p className="text-3xl font-bold text-yellow-600">{formatCurrency(arrearsData.summary.averageArrears)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
                    <h2 className="text-2xl font-bold">⚠️ Tenants with Outstanding Balances</h2>
                  </div>
                  {arrearsData.arrears.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="text-6xl mb-4">✅</div>
                      <p className="text-xl text-gray-600">No outstanding arrears!</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Tenant</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Unit</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Monthly Rent</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total Paid</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Expected</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Arrears</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arrearsData.arrears.map((arrear) => (
                            <tr key={arrear.lease_id} className="border-b hover:bg-red-50">
                              <td className="px-6 py-4">
                                <div className="font-semibold">{arrear.tenant_name}</div>
                                <div className="text-xs text-gray-500">{arrear.tenant_email}</div>
                              </td>
                              <td className="px-6 py-4">{arrear.unit_name}</td>
                              <td className="px-6 py-4">{formatCurrency(arrear.rent_amount)}</td>
                              <td className="px-6 py-4 text-green-600">{formatCurrency(arrear.total_paid)}</td>
                              <td className="px-6 py-4">{formatCurrency(arrear.expected_amount)}</td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                                  {formatCurrency(arrear.arrears_amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{arrear.tenant_phone}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Reports;