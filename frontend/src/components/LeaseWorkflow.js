import React, { useState } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';

const LeaseWorkflow = ({ lease, onClose, onUpdate, currentUser }) => {
  const [signatureName, setSignatureName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const isTenant = currentUser?.role === 'tenant';
  const isLandlord = currentUser?.role === 'landlord';
  const canSign = isTenant && lease.status === 'pending_tenant';
  const canApprove = isLandlord && lease.status === 'pending_landlord';

  const handleSign = async () => {
    if (!signatureName) return setError('Enter your full name');
    if (!agreedToTerms) return setError('Please agree to the terms and conditions');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/leases/${lease.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ signature_name: signatureName, agreed_to_terms: true })
      });
      if (res.ok) {
        alert('✅ Lease signed successfully!');
        onUpdate();
        onClose();
      } else {
        setError('Failed to sign lease');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this lease and activate it?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/leases/${lease.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        alert('✅ Lease approved and activated!');
        onUpdate();
        onClose();
      } else {
        setError('Failed to approve lease');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleReject = async () => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/leases/${lease.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        alert('❌ Lease rejected');
        onUpdate();
        onClose();
      } else {
        setError('Failed to reject lease');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <h2 className="text-xl font-bold">Lease Agreement</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-600">Unit</p><p className="font-semibold">{lease.unit_name}</p></div>
            <div><p className="text-sm text-gray-600">Property</p><p className="font-semibold">{lease.property_name}</p></div>
            <div><p className="text-sm text-gray-600">Monthly Rent</p><p className="font-semibold text-blue-600">Ksh {lease.rent_amount?.toLocaleString()}</p></div>
            <div><p className="text-sm text-gray-600">Lease Period</p><p className="font-semibold">{lease.start_date} to {lease.end_date}</p></div>
            {lease.deposit_amount && (
              <div><p className="text-sm text-gray-600">Security Deposit</p><p className="font-semibold">Ksh {lease.deposit_amount?.toLocaleString()}</p></div>
            )}
          </div>

          <div className="border-2 border-gray-200 rounded-lg">
            <button onClick={() => setShowTerms(!showTerms)} className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50">
              <span className="font-semibold">📄 View Full Lease Agreement & Terms</span>
              <span className="text-blue-600">{showTerms ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showTerms && (
              <div className="px-4 pb-4 max-h-96 overflow-y-auto border-t-2 border-gray-200 prose prose-sm pt-4 space-y-3">
                <h3 className="font-bold">RESIDENTIAL LEASE AGREEMENT</h3>
                <div><h4 className="font-semibold">1. PARTIES</h4><p>Between Landlord and {lease.tenant_name}</p></div>
                <div><h4 className="font-semibold">2. PROPERTY</h4><p>{lease.unit_name} at {lease.property_name}</p></div>
                <div><h4 className="font-semibold">3. TERM</h4><p>{lease.start_date} to {lease.end_date}</p></div>
                <div><h4 className="font-semibold">4. RENT</h4><p>Ksh {lease.rent_amount?.toLocaleString()} monthly</p></div>
              </div>
            )}
          </div>

          {canSign && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold">✍️ Sign Your Lease Agreement</h3>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-semibold mb-2">Full Legal Name *</label>
                <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500" placeholder="Enter your full name" />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-5 h-5" />
                <span className="text-sm">I agree to all terms and conditions</span>
              </label>
              <button onClick={handleSign} disabled={loading || !signatureName || !agreedToTerms} className="w-full px-6 py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? '⏳ Signing...' : '✍️ SIGN LEASE'}
              </button>
            </div>
          )}

          {canApprove && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold">✅ Approve Lease Agreement</h3>
              <div className="bg-white rounded-lg p-4 space-y-2">
                <p><strong>Tenant:</strong> {lease.tenant_name}</p>
                <p><strong>Signed by:</strong> {lease.tenant_signature || 'N/A'}</p>
                <p><strong>Signed on:</strong> {lease.tenant_signed_at ? new Date(lease.tenant_signed_at).toLocaleString() : 'N/A'}</p>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
              <div className="flex gap-3">
                <button onClick={handleApprove} disabled={loading} className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {loading ? '⏳ Processing...' : '✅ APPROVE LEASE'}
                </button>
                <button onClick={handleReject} disabled={loading} className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                  ❌ REJECT
                </button>
              </div>
            </div>
          )}

          {!canSign && !canApprove && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">
                {lease.status === 'pending_tenant' && 'Waiting for tenant signature'}
                {lease.status === 'pending_landlord' && 'Waiting for landlord approval'}
                {lease.status === 'active' && '✅ Lease is active'}
                {lease.status === 'draft' && 'Lease is in draft'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaseWorkflow;