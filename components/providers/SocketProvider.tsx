"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { type Socket } from "socket.io-client";
import { getSocket, SocketEvents } from "@/lib/socket";
import { useSocketStore } from "@/stores/socketStore";
import type { TypingPayload, PresencePayload } from "@/types";

const SocketContext = createContext<Socket | null>(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const { setConnected, setTyping, setPresence } = useSocketStore();

  useEffect(() => {
    if (!isSignedIn) return;

    let mounted = true;

    const initSocket = async () => {
      // Always get a fresh token
      const token = await getToken({ skipCache: true });
      if (!token || !mounted) return;

      const socket = getSocket(token);
      socketRef.current = socket;

      // On reconnect, refresh the token
      socket.on(SocketEvents.CONNECT_ERROR, async (err) => {
        if (err.message === "Unauthorized" || err.message === "No token") {
          console.log("Token expired, refreshing...");
          const newToken = await getToken({ skipCache: true });
          if (newToken && mounted) {
            socket.auth = { token: newToken };
            socket.connect();
          }
        }
      });

      socket.on(SocketEvents.CONNECT, () => {
        console.log("✅ Socket connected");
        setConnected(true);
      });

      socket.on(SocketEvents.DISCONNECT, () => {
        setConnected(false);
      });

      socket.on(SocketEvents.TYPING_UPDATE, (payload: TypingPayload) => {
        setTyping(payload);
        if (payload.isTyping) {
          setTimeout(() => {
            useSocketStore.getState().clearTyping(
              payload.conversationId,
              payload.userId
            );
          }, 5000);
        }
      });

      socket.on(SocketEvents.PRESENCE_UPDATE, (payload: PresencePayload) => {
        setPresence(payload);
      });

      socket.connect();
    };

    initSocket();

    // Refresh token every 50 seconds to prevent expiry
    const refreshInterval = setInterval(async () => {
      if (!mounted || !socketRef.current) return;
      const newToken = await getToken({ skipCache: true });
      if (newToken && socketRef.current) {
        socketRef.current.auth = { token: newToken };
        // Reconnect with fresh token if disconnected
        if (!socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    }, 50 * 1000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      if (socketRef.current) {
        socketRef.current.off(SocketEvents.CONNECT);
        socketRef.current.off(SocketEvents.DISCONNECT);
        socketRef.current.off(SocketEvents.CONNECT_ERROR);
        socketRef.current.off(SocketEvents.TYPING_UPDATE);
        socketRef.current.off(SocketEvents.PRESENCE_UPDATE);
      }
    };
  }, [isSignedIn, getToken, setConnected, setTyping, setPresence]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
}