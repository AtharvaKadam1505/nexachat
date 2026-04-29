"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(token?: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const SocketEvents = {
  // Client → Server
  SEND_MESSAGE: "message:send",
  EDIT_MESSAGE: "message:edit",
  DELETE_MESSAGE: "message:delete",
  MARK_READ: "message:read",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  JOIN_CONVERSATION: "conversation:join",
  LEAVE_CONVERSATION: "conversation:leave",

  // Server → Client
  MESSAGE_RECEIVED: "message:received",
  MESSAGE_UPDATED: "message:updated",
  MESSAGE_DELETED: "message:deleted",
  DELIVERY_STATUS: "message:status",
  TYPING_UPDATE: "typing:update",
  PRESENCE_UPDATE: "presence:update",
  CONVERSATION_UPDATE: "conversation:update",
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
} as const;
