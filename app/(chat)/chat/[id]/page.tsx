import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col md:relative md:inset-auto md:z-auto md:h-full md:w-full">
      <ChatWindow conversationId={id} />
    </div>
  );
}