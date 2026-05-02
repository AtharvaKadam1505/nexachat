<div align="center">

<img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" />
<img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript" />
<img src="https://img.shields.io/badge/Socket.IO-4.x-white?style=for-the-badge&logo=socket.io&logoColor=black" />
<img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma" />
<img src="https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" />

# NexaChat

**A production-grade real-time chat application**

[Live Demo](https://nexachat-nine.vercel.app) · [Report Bug](https://github.com/yourusername/nexachat/issues) · [Request Feature](https://github.com/yourusername/nexachat/issues)

</div>

---

## ✨ Features

- 💬 **Real-time messaging** — instant delivery via Socket.IO WebSockets
- 👥 **Direct & Group chats** — one-to-one and multi-participant conversations
- 🔐 **Authentication** — secure sign-up/sign-in via Clerk
- ✅ **Message status** — sent, delivered, and read receipts
- ✏️ **Message actions** — edit, delete for self or everyone, reply inline
- ⌨️ **Typing indicators** — live "user is typing..." feedback
- 🟢 **Online presence** — real-time online/offline status and last seen
- 🌙 **Dark / Light / System** theme toggle
- 📱 **Fully responsive** — mobile-first design, works on all screen sizes
- 🔔 **Unread counters** — per-conversation unread message badges
- 📌 **Chat management** — pin, archive, and mute conversations
- 😀 **Emoji picker** — full emoji support in messages
- 📎 **File attachments** — drag-and-drop file sharing support
- ↩️ **Reply to messages** — inline quoted reply previews
- ⚡ **Optimistic updates** — messages appear instantly before server confirms

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS v3 |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion, Lucide Icons |
| **Real-time** | Socket.IO 4.x (WebSocket + HTTP fallback) |
| **Authentication** | Clerk v6 (JWT, webhooks, session management) |
| **Database** | PostgreSQL 17 via Neon, Prisma ORM 6 |
| **State Management** | Zustand 5, TanStack Query v5 |
| **Validation** | Zod v3 |
| **Deployment** | Vercel (frontend), Railway (socket server) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker Desktop (for local PostgreSQL + Redis)
- Clerk account — [dashboard.clerk.com](https://dashboard.clerk.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nexachat.git
cd nexachat

# Install dependencies
pnpm install

# Install socket server dependencies
cd socket-server && pnpm install && cd ..

# Copy environment variables
cp .env.example .env.local
```

### Environment Setup

Fill in `.env.local` with your credentials:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_WEBHOOK_SECRET=whsec_xxxx

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexachat
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/nexachat

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Run Locally

```bash
# Start PostgreSQL + Redis via Docker
docker compose up -d

# Push database schema
pnpm db:push

# Terminal 1 — Next.js app
pnpm dev

# Terminal 2 — Socket.IO server
cd socket-server && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
nexachat/
├── app/
│   ├── (auth)/              # Sign-in / Sign-up pages
│   ├── (chat)/              # Protected chat pages
│   │   ├── page.tsx         # Conversation list (desktop empty state)
│   │   └── chat/[id]/       # Individual chat page
│   └── api/                 # REST API endpoints
│       ├── conversations/   # CRUD for conversations
│       ├── messages/        # Paginated messages, send, edit, delete
│       ├── users/           # User search and profile
│       ├── uploads/         # File upload presigned URLs
│       └── webhooks/clerk/  # Clerk user sync webhook
├── components/
│   ├── chat/                # Chat UI (Sidebar, ChatWindow, MessageList, etc.)
│   ├── providers/           # Context providers (Socket, Theme, Query)
│   └── ui/                  # Reusable components (Avatar, ThemeToggle)
├── lib/                     # Utilities (db client, socket client, helpers)
├── prisma/                  # Schema, migrations, seed
├── socket-server/           # Standalone Socket.IO server (deployed to Railway)
├── stores/                  # Zustand stores (socket state, presence)
├── types/                   # Shared TypeScript types
└── docker-compose.yml       # Local dev databases
```

---

## 🗄️ Database Schema

```
User ──────────────── ConversationMember ──── Conversation
  │                                                │
  └── Message ──── MessageStatus                  │
        │                                          │
        └── replyTo (self-relation)                │
```

Key design decisions:
- **Cursor-based pagination** on all message queries — never loads all messages at once
- **Soft deletes** — deleted messages keep their record, content is nulled
- **Idempotent sends** — `clientMessageId` (UUID v4) prevents duplicate messages on retry
- **Composite indexes** on `(conversationId, createdAt)` for fast message queries

---

## 📡 API Reference

### Conversations
```
GET    /api/conversations          List all conversations
POST   /api/conversations          Create DM or group chat
PATCH  /api/conversations/:id      Pin, archive, mute
DELETE /api/conversations/:id      Leave conversation
```

### Messages
```
GET    /api/messages?conversationId=&cursor=    Paginated messages
POST   /api/messages                            Send message
PATCH  /api/messages/:id                        Edit message
DELETE /api/messages/:id?scope=self|all         Delete message
```

### Users
```
GET    /api/users/me               Current user profile
GET    /api/users/search?q=        Search users by name/username
```

---

## 🔌 Socket Events

### Client → Server
| Event | Description |
|-------|-------------|
| `conversation:join` | Subscribe to a conversation room |
| `message:send` | Broadcast new message to room |
| `message:edit` | Broadcast message edit |
| `message:delete` | Broadcast message deletion |
| `typing:start` | Notify others user is typing |
| `typing:stop` | Notify others user stopped typing |

### Server → Client
| Event | Description |
|-------|-------------|
| `message:received` | New message in conversation |
| `message:updated` | Message was edited |
| `message:deleted` | Message was deleted |
| `typing:update` | Typing status changed |
| `presence:update` | User went online/offline |

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend + API | Vercel | `nexachat-nine.vercel.app` |
| Socket Server | Railway | `nexachat-production.up.railway.app` |
| Database | Neon (PostgreSQL) | Managed |

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy Socket Server to Railway

Set root directory to `socket-server` in Railway settings.

Required environment variables:
```
CLERK_SECRET_KEY=sk_live_xxxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 🔒 Security

- All API routes protected by Clerk JWT middleware
- Conversation membership verified on every read/write
- Input validation with Zod on all endpoints
- Webhook signature verification via svix
- Soft deletes preserve audit trail
- File type validation on upload endpoints

---

## 📸 Screenshots

> Add screenshots of your app here

| Light Mode | Dark Mode |
|-----------|-----------|
| ![Light](screenshots/light.png) | ![Dark](screenshots/dark.png) |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Built with ❤️ using Next.js 15, Clerk, Prisma, Socket.IO and Tailwind CSS

⭐ Star this repo if you found it helpful!

</div>