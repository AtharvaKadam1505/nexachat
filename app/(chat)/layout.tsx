import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { Sidebar } from "@/components/chat/Sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <SocketProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r flex flex-col h-full"
          style={{ borderColor: "hsl(var(--border))" }}>
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden hidden md:flex">
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}
