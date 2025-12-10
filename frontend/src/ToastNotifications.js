import React, { useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import socketService from './socket-service';

const ToastNotifications = () => {
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    // Payment notifications
    const unsubPayment = socketService.on('payment:created', (data) => {
      toast.success(
        <div>
          <strong>💰 {data.message || 'Payment Recorded'}</strong>
          {data.data && data.data.reference_number && (
            <div className="text-sm mt-1">Ref: {data.data.reference_number}</div>
          )}
        </div>,
        {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        }
      );
    });

    // Lease notifications
    const unsubLease = socketService.on('lease:created', (data) => {
      toast.info(
        <div>
          <strong>📝 {data.message || 'Lease Created'}</strong>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000
        }
      );
    });

    const unsubLeaseUpdated = socketService.on('lease:updated', (data) => {
      toast.info(
        <div>
          <strong>📝 Lease Updated</strong>
          {data.message && <div className="text-sm mt-1">{data.message}</div>}
        </div>,
        {
          position: 'top-right',
          autoClose: 5000
        }
      );
    });

    // Property notifications
    const unsubProperty = socketService.on('property:created', (data) => {
      toast.success(
        <div>
          <strong>🏢 {data.message || 'Property Created'}</strong>
        </div>,
        {
          position: 'top-right',
          autoClose: 4000
        }
      );
    });

    // Maintenance notifications
    const unsubMaintenance = socketService.on('maintenance:created', (data) => {
      toast.warning(
        <div>
          <strong>🔧 {data.message || 'Maintenance Request'}</strong>
        </div>,
        {
          position: 'top-right',
          autoClose: 6000
        }
      );
    });

    const unsubMaintenanceUpdated = socketService.on('maintenance:updated', (data) => {
      toast.info(
        <div>
          <strong>🔧 {data.message || 'Maintenance Updated'}</strong>
        </div>,
        {
          position: 'top-right',
          autoClose: 5000
        }
      );
    });

    // Connection status
    const unsubConnection = socketService.on('connection:status', (data) => {
      if (data.connected) {
        toast.success('✅ Connected to real-time updates', {
          position: 'bottom-right',
          autoClose: 2000
        });
      } else {
        toast.error('❌ Disconnected from real-time updates', {
          position: 'bottom-right',
          autoClose: 3000
        });
      }
    });

    const unsubReconnected = socketService.on('connection:reconnected', (data) => {
      toast.success('🔄 Reconnected to server', {
        position: 'bottom-right',
        autoClose: 2000
      });
    });

    // Store all unsubscribe functions
    unsubscribeRefs.current = [
      unsubPayment,
      unsubLease,
      unsubLeaseUpdated,
      unsubProperty,
      unsubMaintenance,
      unsubMaintenanceUpdated,
      unsubConnection,
      unsubReconnected
    ];

    // Cleanup on unmount
    return () => {
      unsubscribeRefs.current.forEach(unsub => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
    };
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
};

export default ToastNotifications;
