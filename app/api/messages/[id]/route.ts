import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const editSchema = z.object({ content: z.string().min(1).max(4000) });
const deleteSchema = z.object({ scope: z.enum(["self", "all"]).default("self") });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const message = await db.message.findUnique({ where: { id } });
  if (!message) return new NextResponse("Not found", { status: 404 });
  if (message.senderId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const parsed = editSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });

  const updated = await db.message.update({
    where: { id },
    data: { content: parsed.data.content, isEdited: true, editedAt: new Date() },
    include: { sender: true, replyTo: { include: { sender: true } }, statuses: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const message = await db.message.findUnique({ where: { id } });
  if (!message) return new NextResponse("Not found", { status: 404 });
  if (message.senderId !== user.id) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "self";

  if (scope === "all") {
    await db.message.update({
      where: { id },
      data: { isDeleted: true, deletedForAll: true, content: null, mediaUrl: null },
    });
  } else {
    await db.message.update({ where: { id }, data: { isDeleted: true } });
  }

  return NextResponse.json({ success: true });
}
