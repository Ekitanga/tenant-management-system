import React, { useState, useEffect } from 'react';
import { Home, User, Calendar, DollarSign, X, Check, AlertCircle } from 'lucide-react';

const TenantAllocation = ({ tenant, onClose, onSuccess, formatCurrency }) => {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  
  const [formData, setFormData] = useState({
    unit_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    rent_amount: '',
    deposit_amount: ''
  });

  useEffect(() => {
    fetchAvailableUnits();
  }, []);

  const fetchAvailableUnits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/units/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableUnits(data.units);
      }
    } catch (error) {
      console.error('Failed to fetch available units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    setFormData(prev => ({
      ...prev,
      unit_id: unit.id,
      rent_amount: unit.rent_amount,
      deposit_amount: unit.deposit_amount || unit.rent_amount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    // FIXED: Use tenant_id first, fallback to id, then user_id
    const tenantId = tenant.tenant_id || tenant.id || tenant.user_id;
    
    console.log('🔍 Tenant object received:', tenant);
    console.log('✅ Using tenant ID:', tenantId);
    
    if (!tenantId || tenantId === 0) {
      setError('Tenant ID not found. Please refresh the page and try again.');
      setSubmitting(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantId}/allocate`, {
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
        setError(data.error || 'Failed to allocate tenant');
      }
    } catch (error) {
      setError('Failed to allocate tenant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Allocate Unit to Tenant</h3>
              <p className="text-sm text-gray-500">Assign {tenant.full_name} to an available unit</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Tenant Info */}
          <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium">{tenant.full_name}</p>
              <p className="text-sm text-gray-500">{tenant.email} • {tenant.phone}</p>
            </div>
          </div>

          {/* Available Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Available Unit *
            </label>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-maroon-900 border-t-transparent mx-auto"></div>
              </div>
            ) : availableUnits.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No available units</p>
                <p className="text-sm text-gray-400">All units are currently occupied</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-60 overflow-y-auto">
                {availableUnits.map(unit => (
                  <div
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedUnit?.id === unit.id
                        ? 'border-maroon-600 bg-maroon-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{unit.name}</p>
                        <p className="text-sm text-gray-500">{unit.property_name} • {unit.property_location}</p>
                        <p className="text-sm text-gray-500">
                          {unit.bedrooms} bed • {unit.bathrooms} bath
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-maroon-600">{formatCurrency(unit.rent_amount)}</p>
                        <p className="text-xs text-gray-500">per month</p>
                        {selectedUnit?.id === unit.id && (
                          <Check className="w-5 h-5 text-maroon-600 mt-2 ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lease Details */}
          {selectedUnit && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900">Lease Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.rent_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, rent_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit (KES)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, deposit_amount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
          )}

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
              disabled={!selectedUnit || submitting}
              className="px-4 py-2 bg-maroon-900 text-white rounded-lg hover:bg-maroon-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Allocating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Allocate Unit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TenantAllocation;