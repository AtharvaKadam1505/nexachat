import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    email_addresses: { email_address: string; id: string }[];
    image_url: string;
    primary_email_address_id: string;
  };
};

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return new NextResponse("Webhook secret missing", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkUserEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;

  if (type === "user.created" || type === "user.updated") {
    const primaryEmail = data.email_addresses.find(
      (e) => e.id === data.primary_email_address_id
    )?.email_address ?? data.email_addresses[0]?.email_address;

    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(" ") ||
      data.username ||
      "User";

    const username =
      data.username ||
      `user_${data.id.slice(-8)}`;

    await db.user.upsert({
      where: { clerkId: data.id },
      create: {
        clerkId: data.id,
        username,
        displayName,
        email: primaryEmail,
        avatarUrl: data.image_url,
      },
      update: {
        username,
        displayName,
        email: primaryEmail,
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "user.deleted") {
    await db.user.deleteMany({ where: { clerkId: data.id } });
  }

  return NextResponse.json({ success: true });
}
