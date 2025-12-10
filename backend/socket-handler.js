// Socket.io Handler - Centralized WebSocket Logic
const jwt = require('jsonwebtoken');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupMiddleware();
    this.setupConnectionHandlers();
  }

  // Authenticate socket connections
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // Handle socket connections
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.username} (${socket.role}) [${socket.id}]`);

      // Join appropriate rooms based on role
      this.joinRooms(socket);

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Connected to real-time updates',
        userId: socket.userId,
        username: socket.username,
        role: socket.role
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.username} [${socket.id}]`);
      });

      // Handle manual refresh request
      socket.on('request:refresh', (data) => {
        console.log(`🔄 Refresh requested by: ${socket.username}`);
        socket.emit('refresh:triggered', { timestamp: new Date().toISOString() });
      });
    });
  }

  // Join rooms based on user role
  joinRooms(socket) {
    // All users join a general room
    socket.join('all-users');

    // Role-based rooms
    if (socket.role === 'admin') {
      socket.join('admin');
      console.log(`  → Joined: admin room`);
    } else if (socket.role === 'landlord') {
      socket.join(`landlord-${socket.userId}`);
      console.log(`  → Joined: landlord-${socket.userId} room`);
    } else if (socket.role === 'tenant') {
      socket.join(`tenant-${socket.userId}`);
      console.log(`  → Joined: tenant-${socket.userId} room`);
    }
  }

  // ============ EVENT EMITTERS ============

  // Payment Events
  emitPaymentCreated(payment, tenantUserId, landlordId) {
    console.log(`📤 Broadcasting payment:created for tenant ${tenantUserId}`);
    
    // Notify the tenant
    this.io.to(`tenant-${tenantUserId}`).emit('payment:created', {
      type: 'payment',
      action: 'created',
      data: payment,
      message: `Payment of KES ${payment.amount.toLocaleString()} recorded`,
      timestamp: new Date().toISOString()
    });

    // Notify the landlord
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('payment:created', {
        type: 'payment',
        action: 'created',
        data: payment,
        message: `New payment received: KES ${payment.amount.toLocaleString()}`,
        timestamp: new Date().toISOString()
      });
    }

    // Notify admins
    this.io.to('admin').emit('payment:created', {
      type: 'payment',
      action: 'created',
      data: payment,
      message: `Payment recorded: ${payment.tenant_name}`,
      timestamp: new Date().toISOString()
    });

    // Trigger dashboard refresh for all relevant users
    this.emitDashboardRefresh([tenantUserId, landlordId]);
  }

  // Lease Events
  emitLeaseCreated(lease, tenantUserId, landlordId) {
    console.log(`📤 Broadcasting lease:created for tenant ${tenantUserId}`);
    
    // Notify the tenant
    this.io.to(`tenant-${tenantUserId}`).emit('lease:created', {
      type: 'lease',
      action: 'created',
      data: lease,
      message: `New lease agreement created`,
      timestamp: new Date().toISOString()
    });

    // Notify the landlord
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('lease:created', {
        type: 'lease',
        action: 'created',
        data: lease,
        message: `New lease signed`,
        timestamp: new Date().toISOString()
      });
    }

    // Notify admins
    this.io.to('admin').emit('lease:created', {
      type: 'lease',
      action: 'created',
      data: lease,
      timestamp: new Date().toISOString()
    });

    // Trigger dashboard refresh
    this.emitDashboardRefresh([tenantUserId, landlordId]);
  }

  emitLeaseUpdated(lease, tenantUserId, landlordId) {
    console.log(`📤 Broadcasting lease:updated`);
    
    this.io.to(`tenant-${tenantUserId}`).emit('lease:updated', {
      type: 'lease',
      action: 'updated',
      data: lease,
      timestamp: new Date().toISOString()
    });

    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('lease:updated', {
        type: 'lease',
        action: 'updated',
        data: lease,
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('lease:updated', {
      type: 'lease',
      action: 'updated',
      data: lease,
      timestamp: new Date().toISOString()
    });

    this.emitDashboardRefresh([tenantUserId, landlordId]);
  }

  // Property/Unit Events
  emitPropertyCreated(property, landlordId) {
    console.log(`📤 Broadcasting property:created`);
    
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('property:created', {
        type: 'property',
        action: 'created',
        data: property,
        message: `Property "${property.name}" added`,
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('property:created', {
      type: 'property',
      action: 'created',
      data: property,
      timestamp: new Date().toISOString()
    });

    this.emitDashboardRefresh([landlordId]);
  }

  emitPropertyDeleted(propertyId, landlordId) {
    console.log(`📤 Broadcasting property:deleted`);
    
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('property:deleted', {
        type: 'property',
        action: 'deleted',
        data: { id: propertyId },
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('property:deleted', {
      type: 'property',
      action: 'deleted',
      data: { id: propertyId },
      timestamp: new Date().toISOString()
    });

    this.emitDashboardRefresh([landlordId]);
  }

  emitUnitCreated(unit, landlordId) {
    console.log(`📤 Broadcasting unit:created`);
    
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('unit:created', {
        type: 'unit',
        action: 'created',
        data: unit,
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('unit:created', {
      type: 'unit',
      action: 'created',
      data: unit,
      timestamp: new Date().toISOString()
    });

    this.emitDashboardRefresh([landlordId]);
  }

  emitUnitDeleted(unitId, landlordId) {
    console.log(`📤 Broadcasting unit:deleted`);
    
    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('unit:deleted', {
        type: 'unit',
        action: 'deleted',
        data: { id: unitId },
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('unit:deleted', {
      type: 'unit',
      action: 'deleted',
      data: { id: unitId },
      timestamp: new Date().toISOString()
    });

    this.emitDashboardRefresh([landlordId]);
  }

  // Maintenance Events
  emitMaintenanceCreated(request, tenantUserId, landlordId) {
    console.log(`📤 Broadcasting maintenance:created`);
    
    this.io.to(`tenant-${tenantUserId}`).emit('maintenance:created', {
      type: 'maintenance',
      action: 'created',
      data: request,
      message: 'Maintenance request submitted',
      timestamp: new Date().toISOString()
    });

    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('maintenance:created', {
        type: 'maintenance',
        action: 'created',
        data: request,
        message: `New maintenance request: ${request.title}`,
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('maintenance:created', {
      type: 'maintenance',
      action: 'created',
      data: request,
      timestamp: new Date().toISOString()
    });
  }

  emitMaintenanceUpdated(request, tenantUserId, landlordId) {
    console.log(`📤 Broadcasting maintenance:updated`);
    
    this.io.to(`tenant-${tenantUserId}`).emit('maintenance:updated', {
      type: 'maintenance',
      action: 'updated',
      data: request,
      message: `Maintenance request ${request.status}`,
      timestamp: new Date().toISOString()
    });

    if (landlordId) {
      this.io.to(`landlord-${landlordId}`).emit('maintenance:updated', {
        type: 'maintenance',
        action: 'updated',
        data: request,
        timestamp: new Date().toISOString()
      });
    }

    this.io.to('admin').emit('maintenance:updated', {
      type: 'maintenance',
      action: 'updated',
      data: request,
      timestamp: new Date().toISOString()
    });
  }

  // Dashboard Refresh
  emitDashboardRefresh(userIds = []) {
    console.log(`📤 Broadcasting dashboard:refresh`);
    
    // Refresh for specific users
    userIds.forEach(userId => {
      if (userId) {
        this.io.to(`landlord-${userId}`).emit('dashboard:refresh', {
          timestamp: new Date().toISOString()
        });
        this.io.to(`tenant-${userId}`).emit('dashboard:refresh', {
          timestamp: new Date().toISOString()
        });
      }
    });

    // Always refresh admin dashboard
    this.io.to('admin').emit('dashboard:refresh', {
      timestamp: new Date().toISOString()
    });
  }

  // Notification Events
  emitNotification(userId, notification) {
    console.log(`📤 Broadcasting notification to user ${userId}`);
    
    this.io.to(`tenant-${userId}`).emit('notification:new', {
      type: 'notification',
      action: 'new',
      data: notification,
      timestamp: new Date().toISOString()
    });

    this.io.to(`landlord-${userId}`).emit('notification:new', {
      type: 'notification',
      action: 'new',
      data: notification,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast to all users
  broadcastToAll(event, data) {
    console.log(`📤 Broadcasting ${event} to all users`);
    this.io.to('all-users').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Get connection statistics
  getStats() {
    const sockets = this.io.sockets.sockets;
    const connections = Array.from(sockets.values());
    
    return {
      totalConnections: connections.length,
      admins: connections.filter(s => s.role === 'admin').length,
      landlords: connections.filter(s => s.role === 'landlord').length,
      tenants: connections.filter(s => s.role === 'tenant').length,
      users: connections.map(s => ({
        id: s.id,
        username: s.username,
        role: s.role
      }))
    };
  }
}

module.exports = SocketHandler;
