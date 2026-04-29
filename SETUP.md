# 🚀 NexaChat — Complete Setup Guide

A production-grade real-time chat application built with Next.js 15, Socket.IO, Clerk, Prisma, and PostgreSQL.

---

## 📋 Prerequisites

Before you begin, make sure you have:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v22 LTS | https://nodejs.org |
| pnpm | v9+ | `npm i -g pnpm` |
| Docker Desktop | Latest | https://docker.com |
| Git | Any | https://git-scm.com |

---

## 🗂️ Project Structure

```
nexachat/
├── app/                    # Next.js App Router pages & API routes
│   ├── (auth)/             # Sign-in / Sign-up pages (Clerk)
│   ├── (chat)/             # Protected chat pages
│   └── api/                # REST API endpoints
├── components/
│   ├── chat/               # Chat UI components
│   ├── providers/          # Context providers (Socket, Theme, Query)
│   └── ui/                 # Reusable UI components
├── lib/                    # Utilities (db, socket, utils)
├── prisma/                 # Database schema + migrations + seed
├── socket-server/          # Standalone Socket.IO server
├── stores/                 # Zustand global state
├── types/                  # TypeScript type definitions
├── docker-compose.yml      # Local Postgres + Redis
└── .env.example            # Environment variable template
```

---

## ⚡ Quick Start (Local Development)

### Step 1 — Clone and install dependencies

```bash
git clone <your-repo-url> nexachat
cd nexachat

# Install Next.js app dependencies
npm install

# Install socket server dependencies
cd socket-server && pnpm install && cd ..
```

---

### Step 2 — Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in each section (detailed below).

---

### Step 3 — Start local databases

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 17** on `localhost:5432`
- **Redis 8** on `localhost:6379`

Verify they're running:
```bash
docker ps
# Should show nexachat-postgres and nexachat-redis as "Up"
```

For local dev, use these in your `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexachat?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/nexachat?schema=public"
REDIS_URL="redis://localhost:6379"
```

---

### Step 4 — Set up Clerk Authentication

1. Go to **https://dashboard.clerk.com** and create a new application
2. Choose "Email + Password" and/or social providers
3. From **API Keys** page, copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

4. Set up a **Webhook** to sync users to your database:
   - Go to **Webhooks → Add Endpoint**
   - URL: `https://your-domain.com/api/webhooks/clerk`
     - For local dev: use [ngrok](https://ngrngrok helpok.com) → `ngrok http 3000` → copy the HTTPS URL
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy the **Signing Secret** → `CLERK_WEBHOOK_SECRET`

5. Update `.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_WEBHOOK_SECRET=whsec_xxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

---

### Step 5 — Set up Database with Prisma

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates all tables)
pnpm db:push

# (Optional) Seed with demo data
pnpm db:seed
```

To inspect your database visually:
```bash
pnpm db:studio
# Opens Prisma Studio at http://localhost:5555
```

---

### Step 6 — Start the development servers

You need **two terminals**:

**Terminal 1 — Next.js app:**
```bash
pnpm dev
# Starts on http://localhost:3000
```

**Terminal 2 — Socket.IO server:**
```bash
cd socket-server
pnpm dev
# Starts on http://localhost:3001
```

Update `.env.local`:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

### Step 7 — Create your first user

1. Open http://localhost:3000
2. Click **Sign Up** and create an account
3. Clerk will fire a webhook → your DB will be populated
4. You should be redirected to the chat dashboard

> 💡 **Tip**: Open two browser windows (one normal, one incognito) and sign in as different users to test real-time messaging.

---

## 🌐 Production Deployment

### Frontend + API — Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars (or use Vercel dashboard)
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
# ... add all other env vars
```

Key settings in Vercel dashboard:
- **Framework Preset**: Next.js
- **Node.js Version**: 22.x
- **Root Directory**: `.` (project root)

---

### Socket Server — Railway

1. Go to **https://railway.app** → New Project → Deploy from GitHub
2. Select your repo, set **Root Directory** to `socket-server`
3. Add environment variables:
   ```
   CLERK_SECRET_KEY=sk_live_xxxx
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   PORT=3001
   ```
4. Railway auto-detects `package.json` → runs `pnpm start`
5. Copy the generated Railway URL → set as `NEXT_PUBLIC_SOCKET_URL` in Vercel

---

### Database — Neon (Recommended)

1. Go to **https://console.neon.tech** → Create Project
2. Copy the **Connection string** (pooled) → `DATABASE_URL`
3. Copy the **Direct connection** → `DIRECT_URL`
4. Run migrations:
   ```bash
   # Set DATABASE_URL and DIRECT_URL in your local .env.local first
   pnpm db:migrate --name init
   ```
5. For **preview deployments**: Neon's branching creates a fresh DB per PR automatically

---

### Redis — Upstash

1. Go to **https://console.upstash.com** → Create Database
2. Choose region closest to your Vercel deployment
3. Copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`
   - **Redis URL** → `REDIS_URL` (for socket server)

---

### File Storage — Cloudflare R2

1. Go to **https://dash.cloudflare.com** → R2 Object Storage → Create Bucket
2. Name it `nexachat-media`
3. Go to **Manage R2 API Tokens** → Create Token with Object Read & Write
4. Copy:
   - Account ID → `R2_ACCOUNT_ID`
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
5. Enable **Public Access** on the bucket → copy domain → `NEXT_PUBLIC_CDN_URL`
6. Update `app/api/uploads/presign/route.ts` to use real AWS S3 SDK:

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const uploadUrl = await getSignedUrl(
  r2,
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  }),
  { expiresIn: 300 }
);
```

---

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema (no migration history) |
| `pnpm db:migrate` | Create + run migration |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed demo data |

---

## 🔌 API Reference

### Conversations

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/conversations` | List all your conversations |
| POST | `/api/conversations` | Create DM or group chat |
| PATCH | `/api/conversations/:id` | Pin, archive, mute |
| DELETE | `/api/conversations/:id` | Leave conversation |

**Create conversation body:**
```json
{
  "type": "DIRECT",
  "memberIds": ["user_id_here"]
}
```

### Messages

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/messages?conversationId=&cursor=` | Paginated messages |
| POST | `/api/messages` | Send a message |
| PATCH | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id?scope=self\|all` | Delete message |

**Send message body:**
```json
{
  "clientMessageId": "uuid-v4-here",
  "conversationId": "conv_id",
  "content": "Hello!",
  "type": "TEXT",
  "replyToId": "optional_message_id"
}
```

### Users

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users/me` | Get current user |
| GET | `/api/users/search?q=` | Search users |

---

## 📡 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `conversation:join` | `{ conversationId }` | Subscribe to a conversation room |
| `conversation:leave` | `{ conversationId }` | Unsubscribe |
| `message:send` | `Message` | Broadcast new message |
| `message:edit` | `{ id, content, conversationId }` | Broadcast edit |
| `message:delete` | `{ messageId, scope, conversationId }` | Broadcast delete |
| `message:read` | `{ conversationId, userId }` | Mark as read |
| `typing:start` | `{ conversationId, userId, displayName }` | Typing started |
| `typing:stop` | `{ conversationId, userId, displayName }` | Typing stopped |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `message:received` | `Message` | New message in conversation |
| `message:updated` | `Message` | Message was edited |
| `message:deleted` | `{ messageId, scope }` | Message was deleted |
| `message:status` | `{ userId, status }` | Delivery status update |
| `typing:update` | `TypingPayload` | Someone is/stopped typing |
| `presence:update` | `{ userId, isOnline, lastSeenAt }` | Online status changed |

---

## 🎨 Theming

NexaChat supports **light**, **dark**, and **system** themes out of the box.

- Toggle via the sun/moon/monitor icon in the sidebar header
- Powered by `next-themes`
- CSS variables defined in `app/globals.css`
- Persisted to `localStorage` automatically

To customise colours, edit the CSS variables in `app/globals.css`:

```css
:root {
  --primary: 214 89% 47%;     /* Brand blue */
  --background: 0 0% 100%;    /* Page background */
  --bubble-sent: 214 89% 47%; /* Sent message bubble */
  /* ... */
}

.dark {
  --primary: 214 89% 57%;
  --background: 220 18% 10%;
  /* ... */
}
```

---

## 📱 Responsive Design

| Breakpoint | Behaviour |
|-----------|-----------|
| Mobile (`< md`) | Full-screen sidebar. Tapping a conversation opens full-screen chat. Back button returns to sidebar. |
| Tablet (`md`) | Sidebar (320px) + Chat panel side by side |
| Desktop (`lg+`) | Wider sidebar (384px) + Chat panel |

---

## 🐛 Troubleshooting

### "User not found" after sign-up
The Clerk webhook hasn't fired yet. Make sure:
1. Your webhook URL is correct and reachable
2. `CLERK_WEBHOOK_SECRET` matches the one in Clerk dashboard
3. For local dev, ngrok tunnel is running

### Socket.IO connection failing
Check:
1. `NEXT_PUBLIC_SOCKET_URL` points to the correct socket server address
2. The socket server is running (`cd socket-server && pnpm dev`)
3. CORS is configured correctly (CLIENT_URL in socket server matches your app URL)

### Database connection errors
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Reset and recreate
docker-compose down -v
docker-compose up -d
pnpm db:push
```

### Prisma client not found
```bash
pnpm db:generate
```

---

## 🏗️ Architecture Decisions

- **Optimistic updates**: Messages appear instantly on send; replaced with server response
- **Cursor pagination**: All message lists use `createdAt`-based cursors (never offset)
- **Idempotent sends**: `clientMessageId` (UUID v4) prevents duplicate messages on retry
- **Soft deletes**: Deleted messages keep their record; `deletedForAll` toggles visibility
- **Socket rooms**: Each conversation is a Socket.IO room (`conversation:{id}`)
- **Theme variables**: All colours are CSS variables → dark mode is a single class toggle

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.x | Full-stack React framework |
| `@clerk/nextjs` | 6.x | Authentication |
| `@prisma/client` | 6.x | Type-safe database ORM |
| `socket.io` / `socket.io-client` | 4.x | Real-time WebSocket |
| `@tanstack/react-query` | 5.x | Server state + infinite scroll |
| `zustand` | 5.x | Client state (socket, presence) |
| `next-themes` | 0.4.x | Dark/light mode |
| `framer-motion` | 11.x | Animations |
| `zod` | 3.x | Schema validation |
| `sonner` | 1.x | Toast notifications |
| `emoji-picker-react` | 4.x | Emoji picker |
| `react-dropzone` | 14.x | File drag-and-drop |

---

## 🔒 Security Checklist

Before going to production:

- [ ] All API routes verify Clerk JWT (done via middleware)
- [ ] Conversation membership checked on every message read/write
- [ ] File type validation in `/api/uploads/presign`
- [ ] Rate limiting enabled (add Upstash Ratelimit)
- [ ] `CLERK_WEBHOOK_SECRET` set and verified
- [ ] `DIRECT_URL` only used for migrations, never exposed
- [ ] CORS restricted to your actual domain

---

Built with ❤️ using Next.js 15, Clerk, Prisma, Socket.IO, and Tailwind CSS.
