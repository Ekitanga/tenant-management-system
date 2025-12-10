import React, { useState } from 'react';
import { AlertTriangle, X, Calendar, FileText } from 'lucide-react';

const LeaseTermination = ({ lease, onClose, onSuccess, formatCurrency, formatDate }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    termination_date: new Date().toISOString().split('T')[0],
    termination_reason: ''
  });

  const terminationReasons = [
    'End of lease term',
    'Tenant request',
    'Non-payment of rent',
    'Lease violation',
    'Property sale',
    'Mutual agreement',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/leases/${lease.id}/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onSuccess(data);
        onClose();
      } else {
        setError(data.error || 'Failed to terminate lease');
      }
    } catch (error) {
      setError('Failed to terminate lease');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-900">Terminate Lease</h3>
              <p className="text-sm text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Lease Summary */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium text-gray-900">Lease Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tenant</p>
                <p className="font-medium">{lease.tenant_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Unit</p>
                <p className="font-medium">{lease.unit_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Rent</p>
                <p className="font-medium">{formatCurrency(lease.rent_amount)}</p>
              </div>
              <div>
                <p className="text-gray-500">End Date</p>
                <p className="font-medium">{formatDate(lease.end_date)}</p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Warning</p>
                <p className="text-yellow-700">
                  Terminating this lease will:
                </p>
                <ul className="list-disc ml-4 mt-1 text-yellow-700">
                  <li>Mark the unit as vacant</li>
                  <li>Notify the tenant</li>
                  <li>Update all related records</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Termination Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Termination Date *
            </label>
            <input
              type="date"
              required
              value={formData.termination_date}
              onChange={(e) => setFormData(prev => ({ ...prev, termination_date: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Termination *
            </label>
            <select
              required
              value={formData.termination_reason}
              onChange={(e) => setFormData(prev => ({ ...prev, termination_reason: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 mb-2"
            >
              <option value="">Select a reason...</option>
              {terminationReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
            {formData.termination_reason === 'Other' && (
              <textarea
                placeholder="Please specify the reason..."
                value={formData.termination_reason === 'Other' ? '' : formData.termination_reason}
                onChange={(e) => setFormData(prev => ({ ...prev, termination_reason: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 h-20"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Terminating...
                </>
              ) : (
                'Terminate Lease'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaseTermination;
