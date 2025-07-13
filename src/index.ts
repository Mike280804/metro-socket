import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Track active rooms and connections
const activeRooms = new Map();
const socketToUser = new Map();

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("joinRoom", ({ userId }) => {
    const previousUserId = socketToUser.get(socket.id);
    if (previousUserId) {
      socket.leave(previousUserId);
    }

    socket.join(userId);
    socketToUser.set(socket.id, userId);

    if (!activeRooms.has(userId)) {
      activeRooms.set(userId, new Set());
    }
    activeRooms.get(userId).add(socket.id);
  });

  socket.on("ticketScanned", ({ ticketId, userId }) => {
    const userSockets = activeRooms.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return;
    }

    io.to(userId).emit("ticketUpdated", { ticketId });
  });

  socket.on("disconnect", () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const userSockets = activeRooms.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeRooms.delete(userId);
        }
      }
      socketToUser.delete(socket.id);
    }
  });

  // Ping/pong for debugging
  socket.on("ping", () => {
    socket.emit("pong");
  });
});

httpServer.listen(4000, () => {
  console.log("WS Server listening on port 4000");
});
