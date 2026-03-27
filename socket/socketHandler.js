/**
 * Socket.IO Event Handlers
 * Manages real-time communication between mobile app and admin dashboard
 */

const initializeSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    socket.on('mobile_danger_alert', (data) => {
      const lat = data?.location?.lat ?? data?.lat ?? null;
      const lng = data?.location?.lng ?? data?.lng ?? null;

      io.emit('admin_alert', {
        message: data?.message || data?.msg || 'Tourist entered Danger Zone',
        location: lat != null && lng != null ? { lat, lng } : null,
        timestamp: data?.timestamp || new Date().toISOString(),
        severity: 'critical'
      });
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });
};

module.exports = initializeSocketHandlers;
