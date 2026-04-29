import "dotenv/config";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { verifyToken } from "@clerk/backend"; 

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";



const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Presence tracking (in-memory; replace with Redis in production) ──────────
const onlineUsers = new Map<string, { socketId: string; userId: string; lastSeen: Date }>();
const userSockets = new Map<string, string>(); // userId → socketId
const socketUsers = new Map<string, string>(); // socketId → userId

// ── Auth middleware ──────────────────────────────────────────────────────────
io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("No token"));

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    (socket as Socket & { clerkId: string }).clerkId = payload.sub;
    next();
  } catch (err) {
    console.error("Socket auth failed:", err);
    next(new Error("Unauthorized"));
  }
});

// ── Connection handler ────────────────────────────────────────────────────────
io.on("connection", (socket: Socket) => {
  const s = socket as Socket & { userId: string; clerkId: string };
  console.log(`[socket] connected: ${s.id} | clerkId: ${s.clerkId}`);

  userSockets.set(s.clerkId, s.id);
  socketUsers.set(s.id, s.clerkId);

  // Broadcast presence
  io.emit("presence:update", {
    userId: s.clerkId,
    isOnline: true,
    lastSeenAt: new Date().toISOString(),
  });

  // ── Conversation room management ───────────────────────────────────────────
  socket.on("conversation:join", ({ conversationId }: { conversationId: string }) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`[socket] ${s.id} joined conversation:${conversationId}`);
  });

  socket.on("conversation:leave", ({ conversationId }: { conversationId: string }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // ── Message events ─────────────────────────────────────────────────────────
  socket.on("message:send", (message: {
    id: string;
    conversationId: string;
    senderId: string;
    content?: string;
    type: string;
    createdAt: string;
    sender: object;
    statuses?: object[];
    replyTo?: object | null;
    mediaUrl?: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    deletedForAll: boolean;
    editedAt: string | null;
    clientMessageId: string;
    mediaMetadata?: object | null;
    replyToId?: string | null;
  }) => {
    // Broadcast to ALL sockets in the room (including sender on other devices)
    socket.to(`conversation:${message.conversationId}`).emit("message:received", message);
  });

  socket.on("message:edit", (message: { id: string; conversationId: string; content: string; isEdited: boolean; editedAt: string }) => {
    socket.to(`conversation:${message.conversationId}`).emit("message:updated", message);
  });

  socket.on("message:delete", ({ messageId, scope, conversationId }: { messageId: string; scope: string; conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit("message:deleted", { messageId, scope, conversationId });
  });

  socket.on("message:read", ({ conversationId, userId }: { conversationId: string; userId: string }) => {
    socket.to(`conversation:${conversationId}`).emit("message:status", { conversationId, userId, status: "READ" });
  });

  // ── Typing events ──────────────────────────────────────────────────────────
  socket.on("typing:start", (payload: { conversationId: string; userId: string; displayName: string }) => {
    socket.to(`conversation:${payload.conversationId}`).emit("typing:update", {
      ...payload,
      isTyping: true,
    });
  });

  socket.on("typing:stop", (payload: { conversationId: string; userId: string; displayName: string }) => {
    socket.to(`conversation:${payload.conversationId}`).emit("typing:update", {
      ...payload,
      isTyping: false,
    });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected: ${s.id} (${reason})`);
    userSockets.delete(s.clerkId);
    socketUsers.delete(s.id);

    // Broadcast offline presence
    io.emit("presence:update", {
      userId: s.clerkId,
      isOnline: false,
      lastSeenAt: new Date().toISOString(),
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
});
