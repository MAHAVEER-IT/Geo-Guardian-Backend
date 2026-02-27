/**
 * Socket.IO Event Handlers
 * Manages real-time communication between mobile app and admin dashboard
 */

const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('mobile_danger_alert', (data) => {
      io.emit('admin_alert', {
        message: data.message || 'Tourist entered Danger Zone',
        location: data.location || null,
        timestamp: new Date().toISOString(),
        severity: 'critical'
      });
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = initializeSocketHandlers;
