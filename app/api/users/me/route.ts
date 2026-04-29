import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  return NextResponse.json(user);
}
