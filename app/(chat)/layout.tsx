import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { Sidebar } from "@/components/chat/Sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const clerkUser = await currentUser();
  if (clerkUser) {
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const displayName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "User";
    const username = clerkUser.username || `user_${clerkUser.id.slice(-8)}`;

    try {
      const user = await db.user.upsert({
        where: { clerkId },
        create: { clerkId, username, displayName, email, avatarUrl: clerkUser.imageUrl },
        update: { username, displayName, email, avatarUrl: clerkUser.imageUrl },
      });
      console.log("✅ User synced:", user.id, user.displayName);
    } catch (error) {
      console.error("❌ User sync failed:", error);
    }
  }

  return (
    <SocketProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar — hidden on mobile when in a chat */}
        <aside
          className="w-full md:w-80 lg:w-96 flex-shrink-0 border-r flex flex-col h-full md:flex"
          style={{ borderColor: "hsl(var(--border))" }}
          id="sidebar"
        >
          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </main>
      </div>
    </SocketProvider>
  );
}