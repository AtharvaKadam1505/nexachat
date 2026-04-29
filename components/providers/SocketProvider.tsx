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
      const token = await getToken();
      if (!token || !mounted) return;

      const socket = getSocket(token);
      socketRef.current = socket;

      socket.on(SocketEvents.CONNECT, () => {
        setConnected(true);
      });

      socket.on(SocketEvents.DISCONNECT, () => {
        setConnected(false);
      });

      socket.on(SocketEvents.TYPING_UPDATE, (payload: TypingPayload) => {
        setTyping(payload);
        if (payload.isTyping) {
          setTimeout(() => {
            useSocketStore.getState().clearTyping(payload.conversationId, payload.userId);
          }, 5000);
        }
      });

      socket.on(SocketEvents.PRESENCE_UPDATE, (payload: PresencePayload) => {
        setPresence(payload);
      });

      socket.connect();
    };

    initSocket();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off(SocketEvents.CONNECT);
        socketRef.current.off(SocketEvents.DISCONNECT);
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
