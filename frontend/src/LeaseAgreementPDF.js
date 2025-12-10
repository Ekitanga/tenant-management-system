import React from 'react';
import { X, Download, FileText } from 'lucide-react';

export default function LeaseAgreementPDF({ lease, tenant, unit, property, onClose, formatCurrency, formatDate }) {
  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="lease-pdf-modal" onClick={onClose}>
      <div className="lease-pdf-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="lease-pdf-close">×</button>
        
        <div style={{ padding: '20px 0' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '3px solid #1e293b', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
              RESIDENTIAL LEASE AGREEMENT
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Generated on {formatDate(new Date().toISOString())}</p>
          </div>

          {/* Parties Section */}
          <div style={{ marginBottom: '30px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              This Lease Agreement (hereinafter referred to as the "Agreement") is entered into on <strong>{formatDate(lease?.start_date)}</strong> by and between:
            </p>
          </div>

          {/* Landlord Section */}
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f8fafc', borderLeft: '4px solid #667eea', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
              LANDLORD/PROPERTY MANAGER
            </h3>
            <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <p><strong>Property:</strong> {property?.name || 'Spiraldart Apartments'}</p>
              <p><strong>Location:</strong> {property?.location || 'Westlands, Nairobi'}</p>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                (Hereinafter referred to as the "Landlord")
              </p>
            </div>
          </div>

          {/* Tenant Section */}
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
              TENANT
            </h3>
            <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <p><strong>Full Name:</strong> {tenant?.full_name || 'N/A'}</p>
              <p><strong>Email:</strong> {tenant?.email || 'N/A'}</p>
              <p><strong>Phone:</strong> {tenant?.phone || 'N/A'}</p>
              <p><strong>ID Number:</strong> {tenant?.id_number || 'N/A'}</p>
              <p style={{ marginTop: '8px', fontSize: '13px', color: '#064e3b', fontStyle: 'italic' }}>
                (Hereinafter referred to as the "Tenant")
              </p>
            </div>
          </div>

          {/* Premises Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              1. PREMISES
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155', marginBottom: '12px' }}>
              The Landlord hereby leases to the Tenant, and the Tenant hereby rents from the Landlord, the following described premises:
            </p>
            <div style={{ padding: '16px', background: '#fffbeb', border: '2px solid #fbbf24', borderRadius: '8px' }}>
              <p style={{ fontSize: '15px', lineHeight: '1.8' }}>
                <strong>Unit:</strong> {unit?.name || 'N/A'}<br />
                <strong>Property:</strong> {property?.name || 'Spiraldart Apartments'}<br />
                <strong>Address:</strong> {property?.location || 'Westlands, Nairobi'}<br />
                <strong>Configuration:</strong> {unit?.bedrooms || 'N/A'} Bedroom(s), {unit?.bathrooms || 'N/A'} Bathroom(s)
              </p>
            </div>
          </div>

          {/* Term of Lease */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              2. TERM OF LEASE
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              The term of this Lease shall commence on <strong>{formatDate(lease?.start_date)}</strong> and shall terminate on <strong>{formatDate(lease?.end_date)}</strong>, unless renewed or terminated earlier in accordance with the terms of this Agreement.
            </p>
          </div>

          {/* Rent Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              3. RENT
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155', marginBottom: '12px' }}>
              The Tenant agrees to pay rent as follows:
            </p>
            <ul style={{ fontSize: '15px', lineHeight: '2', color: '#334155', marginLeft: '20px' }}>
              <li><strong>Monthly Rent:</strong> {formatCurrency(lease?.rent_amount)}</li>
              <li><strong>Security Deposit:</strong> {formatCurrency(unit?.deposit_amount || 0)}</li>
              <li><strong>Due Date:</strong> 1st of each month</li>
              <li><strong>Late Fee:</strong> 5% of monthly rent if paid after the 5th</li>
            </ul>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '12px', fontStyle: 'italic' }}>
              Payment shall be made via M-Pesa, bank transfer, or cash at the Landlord's office. All payments must reference the unit number.
            </p>
          </div>

          {/* Security Deposit */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              4. SECURITY DEPOSIT
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              Upon execution of this Agreement, the Tenant shall deposit with the Landlord a security deposit of <strong>{formatCurrency(unit?.deposit_amount || 0)}</strong>. 
              This deposit shall be held by the Landlord as security for the faithful performance by the Tenant of all terms and conditions of this Agreement. 
              The deposit shall be refunded to the Tenant within 30 days after the termination of this Lease, less any deductions for damages or unpaid rent.
            </p>
          </div>

          {/* Utilities */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              5. UTILITIES AND SERVICES
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              The Tenant shall be responsible for the payment of all utilities and services, including but not limited to electricity, water, internet, and garbage collection, 
              unless otherwise specified in writing by the Landlord.
            </p>
          </div>

          {/* Maintenance */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              6. MAINTENANCE AND REPAIRS
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155', marginBottom: '12px' }}>
              The Landlord shall maintain the structural integrity of the premises and ensure that all major systems (plumbing, electrical, HVAC) are in good working order. 
              The Tenant shall be responsible for:
            </p>
            <ul style={{ fontSize: '15px', lineHeight: '2', color: '#334155', marginLeft: '20px' }}>
              <li>Keeping the premises clean and sanitary</li>
              <li>Disposing of all waste in proper receptacles</li>
              <li>Minor repairs and maintenance</li>
              <li>Reporting any damages or needed repairs to the Landlord immediately</li>
            </ul>
          </div>

          {/* Termination */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              7. TERMINATION
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              Either party may terminate this Lease by providing written notice of at least 30 days prior to the intended termination date. 
              The Tenant must vacate the premises by the termination date and leave it in the same condition as when received, normal wear and tear excepted.
            </p>
          </div>

          {/* Governing Law */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '16px', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
              8. GOVERNING LAW
            </h3>
            <p style={{ fontSize: '15px', lineHeight: '1.8', color: '#334155' }}>
              This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya.
            </p>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '50px', paddingTop: '30px', borderTop: '3px solid #1e293b' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
              SIGNATURES
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '30px' }}>LANDLORD:</p>
                <div style={{ borderBottom: '2px solid #1e293b', width: '100%', marginBottom: '8px', height: '60px' }}></div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Signature & Date</p>
              </div>
              
              <div>
                <p style={{ fontSize: '15px', fontWeight: '600', marginBottom: '30px' }}>TENANT:</p>
                <div style={{ borderBottom: '2px solid #1e293b', width: '100%', marginBottom: '8px', height: '60px' }}></div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>Signature & Date</p>
              </div>
            </div>
          </div>

          {/* Download Button */}
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <button
              onClick={handleDownload}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '14px 32px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
            >
              <Download style={{ width: '20px', height: '20px' }} />
              Download / Print PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}