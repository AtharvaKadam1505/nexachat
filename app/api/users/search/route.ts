import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const currentUser = await db.user.findUnique({ where: { clerkId } });
  if (!currentUser) return new NextResponse("User not found", { status: 404 });

  const users = await db.user.findMany({
    where: {
      id: { not: currentUser.id },
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isOnline: true,
      lastSeenAt: true,
    },
    take: 20,
  });

  return NextResponse.json(users);
}
