const { Server } = require('socket.io');
const logger = require('../utils/logger');

/**
 * Initialize Socket.io on the given HTTP server.
 * Returns the io instance for use elsewhere.
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    logger.debug('New real-time client connected', { socketId: socket.id });
    socket.on('disconnect', () => {
      logger.debug('Real-time client disconnected', { socketId: socket.id });
    });
  });

  return io;
}

module.exports = { initializeSocket };
