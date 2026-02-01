# ProRoom

Secure, real-time communication platform with end-to-end encryption. Monorepo with two apps and two shared packages.

## Architecture

- **apps/web**: Next.js 15.2 (App Router, React 19, Zustand 5, TailwindCSS)
- **apps/api**: NestJS 11 (REST + Socket.IO WebSocket, Prisma 6.3, PostgreSQL, Redis)
- **packages/crypto**: E2E encryption library (X25519 ECDH, AES-256-GCM, HKDF, sender keys) using @noble/curves, @noble/ciphers, @noble/hashes
- **packages/types**: Shared TypeScript type definitions (socket events, models, API types)

## Tech Stack

- **Runtime**: Node >= 20, TypeScript ^5.7.0 (strict mode)
- **Package Manager**: pnpm 9.15 with workspace protocol (`workspace:*`)
- **Build System**: Turbo 2.4
- **Database**: PostgreSQL 16 + Prisma ORM
- **Cache/PubSub**: Redis 7 with ioredis + @socket.io/redis-adapter
- **WebRTC**: mediasoup 3.14 (server) + mediasoup-client 3.7 (client)
- **File Storage**: MinIO (S3-compatible)
- **Auth**: JWT (Passport) + Argon2 password hashing
- **Validation**: class-validator + class-transformer (DTOs)
- **Rate Limiting**: @nestjs/throttler (short: 10/1s, medium: 50/10s, long: 200/60s)
- **Deployment**: Docker Compose (Nginx 1.27, PostgreSQL 16, Redis 7, MinIO, coturn)

## Common Commands

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start all apps in development (turbo)
pnpm build            # Build all packages and apps
pnpm lint             # Lint all packages and apps
```

### API-specific

```bash
cd apps/api
pnpm prisma generate    # Generate Prisma client
pnpm prisma migrate dev # Run database migrations
pnpm dev                # Start API in watch mode
```

### Docker

```bash
cd docker
docker compose up -d  # Start all services
```

## Project Structure

```
apps/
  api/src/
    main.ts             # Entry point: ValidationPipe, GlobalExceptionFilter, CORS, RedisIoAdapter
    app.module.ts        # Root module importing all feature modules
    common/
      filters/          # GlobalExceptionFilter (standardized JSON error responses)
    modules/
      auth/             # JWT auth, refresh token rotation, brute-force protection (5 attempts/15min lockout)
        jwt.strategy.ts       # Passport JWT strategy
        jwt-auth.guard.ts     # Auth guard for protected routes
        roles.guard.ts        # Role-based access control guard
        login.dto.ts          # Login validation
        register.dto.ts       # Registration validation
        refresh.dto.ts        # Token refresh validation
      chat/             # WebSocket gateway + service for messaging
      media/            # mediasoup WebRTC call handling + TURN server endpoints
        mediasoup.config.ts   # mediasoup server configuration
        turn.controller.ts    # TURN credential endpoints
        turn.service.ts       # TURN credential logic
      rooms/            # Room CRUD and member management
      users/            # User profiles and management
      keys/             # E2E encryption key distribution
      files/            # File upload/download (MinIO)
      admin/            # Admin operations
    redis/              # RedisModule + RedisService (client init, cleanup)
    prisma/             # Schema, migrations, seed (tsx prisma/seed.ts)
  web/src/
    app/
      page.tsx          # Root redirect to /login
      (auth)/           # Login, register (redirects if already authenticated)
      (main)/           # Protected routes requiring authentication
        chat/           # Chat list + /chat/[roomId] detail
        calls/          # /calls/[roomId] call + /calls/[roomId]/lobby pre-join
        join/[handle]   # Shareable call join link
        profile/        # User profile page
        admin/          # Admin panel
    components/
      chat/             # ChatHeader, MessageBubble, MessageInput, RoomListItem,
                        # CreateRoomModal, RoomInfoPanel, DateSeparator, ScrollToBottom, FileUpload, TypingIndicator
      call/             # VideoGrid, ParticipantTile, CallControls, CallHeader,
                        # IncomingCallDialog, StartCallModal, AddPeopleModal
      layout/           # Layout components (sidebar, navigation)
      ui/               # Avatar, Badge, Modal, SearchInput
    stores/             # Zustand stores (authStore, chatStore, callStore)
    lib/
      api.ts            # Axios client with token refresh interceptor
      socket.ts         # Socket.IO client setup
      crypto.ts         # Client-side crypto operations
      avatar.ts         # Avatar URL generation
      cn.ts             # Class name utility (tailwind-merge)
      message-cache.ts  # Message caching in IndexedDB
    hooks/
      useTypingIndicator.ts  # Typing indicator state and emission
      useUserSearch.ts       # Debounced user search with API
packages/
  crypto/src/           # x25519, session, sender-keys, aes-gcm, hkdf, identity, utils
  types/src/            # socket-events, call, message, user, room, mediasoup, api
docker/
  docker-compose.yml        # Production compose (8 services)
  docker-compose.local.yml  # Local development overrides
  Dockerfile.api            # Multi-stage API build with Prisma migrations
  Dockerfile.web            # Multi-stage Next.js standalone build
  nginx/                    # Reverse proxy, SSL termination, API routing
  coturn/                   # TURN/STUN server config for NAT traversal
  generate-ssl.sh           # SSL certificate generation script
  .env / .env.example       # Environment variable templates
```

## Database Models (Prisma)

- **User** - username (unique), displayName, passwordHash (Argon2), role (ADMIN|MEMBER), isActive, identity key, signed pre-key
- **Session** - tokenHash (SHA256, unique), userId, deviceInfo, ipAddress, expiresAt
- **Room** - name, type (DM|GROUP), call handle, call title, isCallActive, callStartedAt, callStartedBy
- **RoomMember** - roomId+userId (unique composite), role (ADMIN|MEMBER), joinedAt
- **Message** - roomId, senderId, ciphertext (Bytes), nonce (Bytes), encryptionType (PAIRWISE|SENDER_KEY), messageType (TEXT|FILE|IMAGE|SYSTEM), fileId, senderKeyId, recipientUserId, groupMessageId, isEdited, isDeleted
- **ReadReceipt** - messageId+userId (unique composite), readAt
- **SenderKeyDistribution** - roomId+senderUserId+recipientUserId+keyId (unique composite), encryptedSenderKey (Bytes), nonce (Bytes)
- **FileMetadata** - roomId, uploaderId, fileName, mimeType, size, storagePath

## Key Patterns

- **Encryption**: All messages encrypted client-side before transmission. DMs use pairwise X25519 sessions (ECDH shared secret -> HKDF -> AES-256-GCM). Group chats use sender keys distributed per-recipient via pairwise encryption. Crypto keys stored in IndexedDB (idb-keyval). Sender keys ratchet forward per message.
- **WebSocket namespaces**: `/` for chat (messages, presence, typing, call signaling, sender key distribution), `/media` for WebRTC transport/producer/consumer management. Redis adapter enables horizontal scaling.
- **State management**: Zustand stores for auth, chat, and call state. Socket event listeners update stores directly.
- **Database**: Prisma with PostgreSQL. Messages store ciphertext + nonce as `Bytes`. Group messages stored as per-recipient copies linked by `groupMessageId`. Strategic indexes on frequently queried columns.
- **API conventions**: NestJS modules with Controller (HTTP) + Gateway (WebSocket) + Service pattern. DTOs validated with class-validator (whitelist, forbidNonWhitelisted, transform). Global `/api` prefix. Global exception filter returns standardized JSON errors with codes (BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_MANY_REQUESTS, INTERNAL_ERROR).
- **Frontend routing**: Next.js App Router with route groups. `(auth)` redirects authenticated users. `(main)` requires authentication. Shareable call links via `/join/[handle]`.
- **Imports**: `@/` path alias in both web and api apps. `@proroom/types` and `@proroom/crypto` for shared packages.
- **Auth flow**: 15min access tokens, 7-day refresh tokens with rotation. Axios interceptor auto-refreshes expired tokens with a retry queue. Brute-force lockout after 5 failed attempts for 15 minutes (Redis-backed).
- **Calls**: mediasoup SFU routing, per-user producer/consumer tracking, pre-join lobby, shareable call handles, call title, TURN server for NAT traversal.

## Socket Events

**Client -> Server**: `room:join`, `room:leave`, `message:send`, `message:edit`, `message:delete`, `message:read`, `typing:start`, `typing:stop`, `call:initiate`, `call:accept`, `call:reject`, `call:invite`, `call:join-room`, `call:leave-room`, `call:create-transport`, `call:connect-transport`, `call:produce`, `call:consume`, `call:resume-consumer`, `senderkey:distribute`, `senderkey:request`

**Server -> Client**: `message:new`, `message:delivered`, `message:edited`, `message:deleted`, `message:read`, `user:online`, `user:offline`, `user:typing`, `user:stop-typing`, `call:incoming`, `call:signal`, `call:user-joined`, `call:user-left`, `call:ended`, `call:router-rtp-capabilities`, `call:transport-created`, `call:produced`, `call:consumed`, `call:new-producer`, `senderkey:distribute`, `senderkey:request`

## Environment Variables

See `docker/.env.example` and `apps/api/.env.example`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Token signing (64+ chars)
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_ENDPOINT` - File storage
- `MEDIASOUP_LISTEN_IP`, `MEDIASOUP_ANNOUNCED_IP` - WebRTC config
- `MEDIASOUP_MIN_PORT`, `MEDIASOUP_MAX_PORT` - WebRTC port range
- `TURN_SECRET` - TURN server authentication
- `FRONTEND_URL` - CORS origin for API
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` - Frontend API/WS endpoints
- `DOMAIN`, `SERVER_PUBLIC_IP` - Network configuration

## Code Style

- Single quotes, trailing commas, 80-char line width, semicolons, tab width 2, arrow parens always, LF line endings (Prettier)
- Kebab-case files, PascalCase classes, camelCase variables
- ESLint: no explicit-any (error), no console (warn), unused vars (error, `^_` ignored)
- TypeScript strict mode with `noUncheckedIndexedAccess`
- NestJS CLI config in `nest-cli.json`
- Base TypeScript config in `tsconfig.base.json` (ES2022 target)

## Production Deployment

Live at **https://pr.scaleward.net** (server: `89.42.199.97`).

- **Server**: Ubuntu 24.04 (Linux 6.8.0), Docker 29.2, Docker Compose 5.0
- **SSH**: `ssh root@89.42.199.97` (key-based auth via local `~/.ssh/id_ed25519`)
- **SSL**: Let's Encrypt certificate (expires 2026-05-02, auto-renew via certbot systemd timer), certs at `/etc/letsencrypt/live/pr.scaleward.net/` and copied to `/root/ProRoom/docker/nginx/ssl/`
- **Firewall**: ufw inactive (all ports open)
- **Project path on server**: `/root/ProRoom` (cloned from `https://github.com/MohaMehrFelixin/proroom.git`)

### Server-only Changes (not in local repo)

The following changes exist **only on the server** and are not committed to git:

- `docker/.env` - production secrets (DOMAIN=pr.scaleward.net, SERVER_PUBLIC_IP=89.42.199.97, generated DB/Redis/JWT/MinIO/TURN secrets)
- `docker/nginx/nginx.conf` - `server_name` changed from `_` to `pr.scaleward.net`
- `docker/nginx/ssl/fullchain.pem` and `docker/nginx/ssl/privkey.pem` - Let's Encrypt SSL certificates
- **Database manual migrations** - Columns were added directly via SQL on production because migrations weren't generated:
  - Room: `callHandle`, `callTitle`, `isCallActive`, `callStartedAt`, `callStartedBy`
  - Message: `recipientUserId`, `groupMessageId` (+ indexes)
  - A proper migration file (`20260201102700_add_call_and_group_message_columns`) has been created and committed to track these changes.

### Known Issues
- **Silent error handling**: `CreateRoomModal.tsx` and `chat/[roomId]/page.tsx` have empty `catch` blocks that swallow errors with no user feedback.

### Deployment Flow (MUST FOLLOW)

When making changes, always follow this order:
1. **Edit code locally** in `/Users/mohamehr/Projects/ProRoom`
2. **Commit and push to GitHub** (`git add`, `git commit`, `git push`)
3. **SSH into server and pull + rebuild**: `ssh root@89.42.199.97 'cd /root/ProRoom && git pull && cd docker && docker compose up -d --build'`

Never edit code directly on the server. All code changes go through git.

### Deployment Commands

```bash
# SSH into server
ssh root@89.42.199.97

# Rebuild and restart
cd /root/ProRoom/docker && docker compose up -d --build

# View logs
cd /root/ProRoom/docker && docker compose logs -f

# Check status
cd /root/ProRoom/docker && docker compose ps

# Pull latest code and redeploy
cd /root/ProRoom && git pull && cd docker && docker compose up -d --build

# Renew SSL certs (auto-renew is configured, but manual if needed)
certbot renew && cp /etc/letsencrypt/live/pr.scaleward.net/fullchain.pem /root/ProRoom/docker/nginx/ssl/ && cp /etc/letsencrypt/live/pr.scaleward.net/privkey.pem /root/ProRoom/docker/nginx/ssl/ && cd /root/ProRoom/docker && docker compose restart nginx
```

### Services (7 containers)

| Service  | Image              | Ports                          |
|----------|--------------------|--------------------------------|
| nginx    | nginx:1.27-alpine  | 80, 443                        |
| web      | docker-web         | 3000 (internal)                |
| api      | docker-api         | 4000 (internal), 40000-40100/udp+tcp |
| postgres | postgres:16-alpine | 5432 (internal)                |
| redis    | redis:7-alpine     | 6379 (internal)                |
| minio    | minio/minio        | 9000 (internal)                |
| coturn   | coturn/coturn      | 3478/udp+tcp, 5349/tcp, 49152-49200/udp |

## Testing

No test framework is currently configured. This is an area for future improvement.
