import { MessageSquare, ArrowLeft } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 chat-bg">
      <div className="max-w-xs space-y-4">
        <div className="relative inline-flex">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-[10px] text-primary-foreground font-bold">✓</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-foreground">Your Messages</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Select a conversation from the sidebar or start a new one to begin chatting.
          </p>
        </div>

        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Choose a conversation from the left panel</span>
        </div>
      </div>
    </div>
  );
}
