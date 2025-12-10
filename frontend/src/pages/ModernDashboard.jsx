import React from 'react';
import { Home, DollarSign, FileText, AlertCircle, Building2, Users } from 'lucide-react';

const ModernDashboard = ({ user, stats = {} }) => {
  // Tenant Dashboard
  if (user?.role === 'tenant') {
    const tenantCards = [
      {
        title: 'Your Unit',
        value: stats.unit_name || 'N/A',
        subtitle: stats.property_name || '',
        location: stats.location || '',
        icon: Home,
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      },
      {
        title: 'Monthly Rent',
        value: `Ksh ${(stats.monthly_rent || 0).toLocaleString()}`,
        subtitle: `Paid: Ksh ${(stats.paid_this_month || 0).toLocaleString()}`,
        icon: DollarSign,
        gradient: stats.paid_this_month >= stats.monthly_rent 
          ? 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' 
          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
      },
      {
        title: 'Outstanding Balance',
        value: `Ksh ${(stats.outstanding_balance || 0).toLocaleString()}`,
        subtitle: stats.outstanding_balance > 0 ? 'Payment pending' : 'All clear',
        icon: AlertCircle,
        gradient: stats.outstanding_balance > 0 
          ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' 
          : 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
      },
      {
        title: 'Lease Status',
        value: stats.lease_status || 'N/A',
        subtitle: `Ends: ${stats.lease_end ? new Date(stats.lease_end).toLocaleDateString() : 'N/A'}`,
        icon: FileText,
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      }
    ];

    return (
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
            Welcome, {user?.username}!
          </h1>
          <p style={{ color: '#64748b' }}>Here's an overview of your tenancy</p>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {tenantCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: card.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
                }}>
                  <Icon style={{ width: '28px', height: '28px', color: 'white' }} />
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                  {card.title}
                </div>
                {card.subtitle && (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{card.subtitle}</div>
                )}
                {card.location && (
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>📍 {card.location}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lease Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>
            📋 Lease Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Start Date</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                {stats.lease_start ? new Date(stats.lease_start).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>End Date</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                {stats.lease_end ? new Date(stats.lease_end).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Total Paid</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>
                Ksh {(stats.total_paid || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Payment Count</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                {stats.payment_count || 0} payments
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landlord/Admin Dashboard
  const statCards = [
    {
      title: 'Total Properties',
      value: stats.total_properties || 0,
      icon: Building2,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Total Units',
      value: stats.total_units || 0,
      subtitle: `${stats.occupied_units || 0} occupied • ${stats.vacant_units || 0} vacant`,
      icon: Home,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'Active Tenants',
      value: stats.total_tenants || 0,
      icon: Users,
      gradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)'
    },
    {
      title: 'Monthly Revenue',
      value: `Ksh ${(stats.total_collected || 0).toLocaleString()}`,
      subtitle: `Expected: Ksh ${(stats.total_monthly_rent || 0).toLocaleString()}`,
      icon: DollarSign,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Welcome back, {user?.username}!
        </h1>
        <p style={{ color: '#64748b' }}>Here's what's happening with your properties today</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 25px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: card.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
              }}>
                <Icon style={{ width: '28px', height: '28px', color: 'white' }} />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>
                {card.value}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>{card.title}</div>
              {card.subtitle && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{card.subtitle}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overview Card */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>
          📊 Dashboard Overview
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Occupancy Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
              {stats.occupancy_rate || 0}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Net Income</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              Ksh {(stats.net_income || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Maintenance Requests</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {stats.total_requests || 0} ({stats.open_requests || 0} open)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;