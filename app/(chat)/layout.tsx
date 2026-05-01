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
      <div className="relative flex h-screen w-screen overflow-hidden bg-background">

        {/* Sidebar */}
        <aside
          className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r"
          style={{ borderColor: "hsl(var(--border))" }}
        >
          <Sidebar />
        </aside>

        {/* Desktop main panel */}
        <main className="hidden md:flex flex-1 flex-col h-full overflow-hidden">
          {children}
        </main>

        {/* Mobile — renders children which use fixed inset-0 overlay */}
        <div className="md:hidden absolute inset-0 pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>

      </div>
    </SocketProvider>
  );
}