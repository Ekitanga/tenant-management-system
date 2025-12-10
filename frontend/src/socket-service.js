import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize socket connection
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('🔌 Connecting to WebSocket...');
    
    this.socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
    return this.socket;
  }

  // Setup default event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection:status', { connected: true });
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection:failed', { error: error.message });
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.emit('connection:reconnected', { attemptNumber });
    });

    // Payment events
    this.socket.on('payment:created', (data) => {
      console.log('💰 Payment created:', data);
      this.emit('payment:created', data);
    });

    // Lease events
    this.socket.on('lease:created', (data) => {
      console.log('📝 Lease created:', data);
      this.emit('lease:created', data);
    });

    this.socket.on('lease:updated', (data) => {
      console.log('📝 Lease updated:', data);
      this.emit('lease:updated', data);
    });

    // Property/Unit events
    this.socket.on('property:created', (data) => {
      console.log('🏢 Property created:', data);
      this.emit('property:created', data);
    });

    this.socket.on('property:deleted', (data) => {
      console.log('🏢 Property deleted:', data);
      this.emit('property:deleted', data);
    });

    this.socket.on('unit:created', (data) => {
      console.log('🏠 Unit created:', data);
      this.emit('unit:created', data);
    });

    this.socket.on('unit:deleted', (data) => {
      console.log('🏠 Unit deleted:', data);
      this.emit('unit:deleted', data);
    });

    // Maintenance events
    this.socket.on('maintenance:created', (data) => {
      console.log('🔧 Maintenance created:', data);
      this.emit('maintenance:created', data);
    });

    this.socket.on('maintenance:updated', (data) => {
      console.log('🔧 Maintenance updated:', data);
      this.emit('maintenance:updated', data);
    });

    // Dashboard events
    this.socket.on('dashboard:refresh', (data) => {
      console.log('🔄 Dashboard refresh requested:', data);
      this.emit('dashboard:refresh', data);
    });

    // Notification events
    this.socket.on('notification:new', (data) => {
      console.log('🔔 New notification:', data);
      this.emit('notification:new', data);
    });
  }

  // Subscribe to events - Returns unsubscribe function
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    const unsubscribe = () => {
      this.off(event, callback);
    };
    
    return unsubscribe;
  }

  // Unsubscribe from events
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Emit to internal listeners
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // Send event to server
  send(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send event:', event);
      return;
    }
    
    this.socket.emit(event, data);
  }

  // Request manual refresh
  requestRefresh() {
    this.send('request:refresh', { timestamp: new Date().toISOString() });
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
