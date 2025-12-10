import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function TenantLeases() {
  const [leases, setLeases] = useState([]);
  const [selectedLease, setSelectedLease] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeases();
  }, []);

  const fetchLeases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/leases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeases(response.data.leases || []);
    } catch (error) {
      console.error('Error fetching leases:', error);
    }
  };

const handleViewLease = async (lease) => {
  setSelectedLease(lease);
  setShowPreview(true);
  
  if ((lease.status === 'pending_tenant' || lease.status === 'sent') && !lease.viewed_at) {  // UPDATE THIS LINE
    try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/leases/${lease.id}/view`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchLeases();
      } catch (error) {
        console.error('Error marking lease as viewed:', error);
      }
    }
  };

const submitAcceptance = async () => {
  if (!signature || signature.trim().length < 2) {
    alert('Please enter your full name as signature');
    return;
  }

  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/leases/${selectedLease.id}/accept`, 
      { signature },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    
    console.log('✅ Lease acceptance response:', response.data);
    
    alert('✅ Lease accepted successfully! Your lease is now active.');
    setShowSignModal(false);
    setShowPreview(false);
    setSignature('');
    setSelectedLease(null);
    
    // Refresh lease data
    await fetchLeases();
    
  } catch (error) {
    console.error('❌ Error accepting lease:', error);
    console.error('Error details:', error.response?.data);
    
    // Check if lease was actually accepted despite error
    const errorMsg = error.response?.data?.error || 'Failed to accept lease';
    alert(`Error: ${errorMsg}\n\nPlease refresh the page to check if the lease was accepted.`);
    
    // Refresh anyway to check status
    await fetchLeases();
    
  } finally {
    setLoading(false);
  }
};

  const submitRejection = async () => {
    if (!rejectReason || rejectReason.trim().length < 10) {
      alert('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/leases/${selectedLease.id}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      alert('Lease rejected');
      setShowRejectModal(false);
      setShowPreview(false);
      setRejectReason('');
      setSelectedLease(null);
      fetchLeases();
    } catch (error) {
      console.error('Error rejecting lease:', error);
      alert(error.response?.data?.error || 'Failed to reject lease');
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
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

const getStatusBadge = (status) => {
  const badges = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '📝' },
    pending_tenant: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📤' },  // ADD THIS LINE
    sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📤' },
    viewed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '👁️' },
    accepted: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
    active: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '🏠' },
    terminated: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '⛔' },
    expired: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⏰' }
  };
    const badge = badges[status] || badges.draft;
    return { ...badge, status };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Lease Agreements</h1>
          <p className="text-gray-600">Review and manage your rental agreements</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {leases.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
            <div className="text-8xl mb-6">📄</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">No Lease Agreements Yet</h2>
            <p className="text-gray-500 text-lg">Your landlord will send you lease agreements to review here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {leases.map((lease) => {
              const statusBadge = getStatusBadge(lease.status);
              return (
                <div key={lease.id} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-2xl font-bold mb-1">{lease.unit_name}</h3>
                        <p className="text-indigo-100">{lease.property_name}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.icon} {lease.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Financial Details */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
                        <p className="text-xs text-green-600 font-semibold mb-1">MONTHLY RENT</p>
                        <p className="text-2xl font-bold text-green-700">{formatCurrency(lease.rent_amount)}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                        <p className="text-xs text-blue-600 font-semibold mb-1">DEPOSIT</p>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(lease.deposit_amount)}</p>
                      </div>
                    </div>

                    {/* Lease Period */}
                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">START DATE</p>
                          <p className="font-bold text-gray-800">{formatDate(lease.start_date)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">END DATE</p>
                          <p className="font-bold text-gray-800">{formatDate(lease.end_date)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status Messages */}
                    {lease.status === 'rejected' && lease.rejection_reason && (
                      <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                        <p className="text-sm font-bold text-red-800 mb-1">❌ Rejection Reason:</p>
                        <p className="text-sm text-red-700">{lease.rejection_reason}</p>
                      </div>
                    )}

                    {['accepted', 'active'].includes(lease.status) && lease.tenant_signature && (
                      <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                        <p className="text-sm font-bold text-green-800">✅ Digitally Signed</p>
                        <p className="text-sm text-green-700 mt-1">by {lease.tenant_signature}</p>
                        <p className="text-xs text-green-600 mt-1">on {new Date(lease.tenant_signed_at).toLocaleString()}</p>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => handleViewLease(lease)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <span className="text-2xl">👁️</span> View Lease Agreement
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lease Preview Modal */}
      {showPreview && selectedLease && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-3xl font-bold mb-1">Lease Agreement</h2>
                <p className="text-indigo-100">Review all terms and conditions</p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedLease(null);
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center text-3xl font-bold transition"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              {/* Document Header */}
              <div className="text-center border-b-2 border-gray-200 pb-6">
                <h1 className="text-4xl font-bold text-gray-800 mb-3">LEASE AGREEMENT</h1>
                <p className="text-xl text-gray-600">Spiraldart Technologies</p>
                <p className="text-sm text-gray-500 mt-2">Property Management Services</p>
              </div>

              {/* Parties Section */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border-l-4 border-indigo-600">
                  <h3 className="font-bold text-indigo-900 mb-3 text-lg">🏢 LANDLORD</h3>
                  <p className="text-indigo-800 font-semibold">Spiraldart Technologies</p>
                  <p className="text-sm text-indigo-700 mt-2">{selectedLease.property_name}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-l-4 border-purple-600">
                  <h3 className="font-bold text-purple-900 mb-3 text-lg">👤 TENANT</h3>
                  <p className="text-purple-800 font-bold text-lg">{selectedLease.tenant_name}</p>
                  <p className="text-sm text-purple-700 mt-1">{selectedLease.tenant_email}</p>
                </div>
              </div>

              {/* Property Details */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border-l-4 border-blue-600">
                <h3 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2">
                  <span className="text-2xl">🏠</span> PROPERTY DETAILS
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Property Name</p>
                    <p className="text-lg font-bold text-gray-800">{selectedLease.property_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">Unit Number</p>
                    <p className="text-lg font-bold text-gray-800">{selectedLease.unit_name}</p>
                  </div>
                </div>
              </div>

              {/* Financial Terms */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-l-4 border-green-600">
                <h3 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2">
                  <span className="text-2xl">💰</span> FINANCIAL TERMS
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-green-600 font-semibold mb-1">Monthly Rent</p>
                    <p className="text-3xl font-bold text-green-700">{formatCurrency(selectedLease.rent_amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">Due on 1st of each month</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-blue-600 font-semibold mb-1">Security Deposit</p>
                    <p className="text-3xl font-bold text-blue-700">{formatCurrency(selectedLease.deposit_amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">Refundable on exit</p>
                  </div>
                </div>
              </div>

              {/* Lease Duration */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-l-4 border-purple-600">
                <h3 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2">
                  <span className="text-2xl">📅</span> LEASE DURATION
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-purple-600 font-semibold mb-1">Start Date</p>
                    <p className="text-2xl font-bold text-gray-800">{formatDate(selectedLease.start_date)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-purple-600 font-semibold mb-1">End Date</p>
                    <p className="text-2xl font-bold text-gray-800">{formatDate(selectedLease.end_date)}</p>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 text-xl flex items-center gap-2">
                  <span className="text-2xl">📋</span> TERMS & CONDITIONS
                </h3>
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">1.</span>
                    <div>
                      <p className="font-bold text-gray-800">Rent Payment</p>
                      <p>Monthly rent is due on the 1st of each month. Late payments may incur a 5% penalty.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">2.</span>
                    <div>
                      <p className="font-bold text-gray-800">Security Deposit</p>
                      <p>The security deposit will be refunded upon lease termination, subject to property inspection and deductions for damages.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">3.</span>
                    <div>
                      <p className="font-bold text-gray-800">Property Maintenance</p>
                      <p>Tenant is responsible for maintaining the property in good condition and reporting any damages immediately.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">4.</span>
                    <div>
                      <p className="font-bold text-gray-800">Modifications</p>
                      <p>Any modifications to the property require written approval from the landlord.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">5.</span>
                    <div>
                      <p className="font-bold text-gray-800">Termination Notice</p>
                      <p>Either party must provide 30 days written notice before terminating the lease.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">6.</span>
                    <div>
                      <p className="font-bold text-gray-800">Utilities</p>
                      <p>Tenant is responsible for all utility bills including electricity, water, and internet.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-indigo-600 font-bold">7.</span>
                    <div>
                      <p className="font-bold text-gray-800">Subletting</p>
                      <p>Subletting is not permitted without written consent from the landlord.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Section */}
              {selectedLease.tenant_signature && (
                <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                  <h3 className="font-bold text-gray-800 mb-4 text-xl">✅ Digital Signature</h3>
                  <div className="bg-white p-4 rounded-lg border-2 border-green-300">
                    <p className="text-sm text-gray-600 mb-1">Tenant Signature</p>
                    <p className="text-2xl font-bold text-gray-800 mb-2" style={{ fontFamily: 'cursive' }}>
                      {selectedLease.tenant_signature}
                    </p>
                    <p className="text-xs text-gray-500">
                      Digitally signed on {new Date(selectedLease.tenant_signed_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t-2 border-gray-200 p-6 flex gap-4 rounded-b-2xl">
  {['pending_tenant', 'sent', 'viewed'].includes(selectedLease.status) && (  // UPDATE THIS LINE
  <>
    <button
      onClick={() => setShowSignModal(true)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">✍️</span> Accept & Sign
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-2xl">❌</span> Reject
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedLease(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-300 font-bold text-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✍️</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Sign Lease Agreement</h2>
              <p className="text-gray-600">
                By signing below, you agree to all terms and conditions
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-3 text-gray-700">Digital Signature</label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name"
                className="w-full border-2 border-gray-300 rounded-xl px-6 py-4 text-lg focus:ring-4 focus:ring-green-200 focus:border-green-500 transition"
                style={{ fontFamily: 'cursive' }}
              />
              <p className="text-xs text-gray-500 mt-2">This will serve as your legal digital signature</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitAcceptance}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-bold text-lg shadow-lg transition-all"
              >
                {loading ? '⏳ Processing...' : '✅ Sign & Accept'}
              </button>
              <button
                onClick={() => {
                  setShowSignModal(false);
                  setSignature('');
                }}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 disabled:opacity-50 font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Reject Lease</h2>
              <p className="text-gray-600">
                Please provide a reason for rejecting this agreement
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-bold mb-3 text-gray-700">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you're rejecting this lease (minimum 10 characters)..."
                rows="5"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-red-200 focus:border-red-500 transition resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={submitRejection}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 disabled:opacity-50 font-bold text-lg shadow-lg transition-all"
              >
                {loading ? '⏳ Processing...' : '❌ Confirm Rejection'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-4 rounded-xl hover:bg-gray-300 disabled:opacity-50 font-bold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantLeases;