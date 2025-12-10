const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.role = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId} (${socket.role})`);
  socket.emit('connection:status', { connected: true });
  socket.on('disconnect', () => console.log(`❌ User disconnected: ${socket.userId}`));
});

const routes = require('./routes');
app.use('/api', routes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Spiraldart TMS API', version: '1.0', status: 'running' });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ message: 'Route not found', path: req.path, method: req.method });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log(`║  🚀 Server running on port ${PORT}      ║`);
  console.log(`║  🔌 Socket.IO initialized              ║`);
  console.log(`║  📡 API: http://localhost:${PORT}/api  ║`);
  console.log('╚════════════════════════════════════════╝');
});

const db = require('./database');
try {
  db.prepare('SELECT 1 as test').get();
  console.log('✅ Connected to SQLite database');
} catch (err) {
  console.error('❌ Database connection failed:', err);
}

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { app, io };