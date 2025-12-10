import React, { useState } from 'react';
import { X } from 'lucide-react';

const UserModal = ({ user, onClose, onSave, properties }) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    password: '',
    role: 'tenant'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{user ? 'Edit' : 'Create'} Tenant</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" required className="input" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" required className="input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input type="tel" className="input" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input type="text" required className="input" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" required className="input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn btn-primary flex-1">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;