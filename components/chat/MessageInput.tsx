"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Smile, Paperclip, Send, X, Mic, MicOff, Reply } from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useDropzone } from "react-dropzone";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageInputProps {
  onSend: (content: string, replyToId?: string, mediaFile?: File) => Promise<void>;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  replyTo,
  onCancelReply,
  disabled,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  const handleInput = (value: string) => {
    setContent(value);
    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      onTypingStart();
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed && !selectedFile) return;
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop();
    const file = selectedFile;
    setContent("");
    setSelectedFile(null);
    setFilePreview(null);
    await onSend(trimmed, replyTo?.id, file ?? undefined);
    textareaRef.current?.focus();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }, []);

  const { getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxSize: 50 * 1024 * 1024,
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [content]);

  return (
    <div className="border-t px-3 py-3 space-y-2" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--background))" }}>
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-start gap-2 bg-muted/50 rounded-xl px-3 py-2 border-l-2 border-primary">
          <Reply className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyTo.sender.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content ?? "Media"}</p>
          </div>
          <button onClick={onCancelReply} className="p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* File preview */}
      {selectedFile && (
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2">
          {filePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Paperclip className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={() => { setSelectedFile(null); setFilePreview(null); }}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center z-30 px-3">
          <EmojiPicker
            theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(e) => {
              setContent((prev) => prev + e.emoji);
              textareaRef.current?.focus();
            }}
            width="100%"
            height={350}
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={cn(
            "p-2.5 rounded-xl flex-shrink-0 transition-all",
            showEmoji
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Smile className="w-5 h-5" />
        </button>

        <input {...getInputProps()} className="hidden" />
        <button
          onClick={open}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div
          className="flex-1 relative bg-muted/60 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/40 transition-all"
          onClick={() => { if (showEmoji) setShowEmoji(false); }}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            disabled={disabled}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed max-h-[120px]"
            style={{ scrollbarWidth: "none" }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={(!content.trim() && !selectedFile) || disabled || uploading}
          className={cn(
            "p-2.5 rounded-xl flex-shrink-0 transition-all",
            content.trim() || selectedFile
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
