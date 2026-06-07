# CLAUDE.md — Project Context for Claude Code

## CRITICAL RULES

- **NEVER commit or push to git.** The developer reviews all changes manually and commits themselves.
- **NEVER write comments in code**

## Project Overview

A real-time "Chat" web application (test assignment for Expla). Monorepo with Angular frontend, NestJS backend, and shared library.

## Tech Stack

- **Monorepo:** Nx
- **Frontend:** Angular (SCSS, esbuild bundler)
- **Backend:** NestJS
- **Testing:** Jest
- **Real-time:** WebSocket (SocketService.IO)
- **Shared library:** `@chat/api-interfaces` — shared interfaces and DTOs

## Project Structure

```
expla-chat/
├── apps/
│   ├── client/          ← Angular app (localhost:4200)
│   ├── client-e2e/      ← Playwright e2e tests
│   ├── server/          ← NestJS app (localhost:3000)
│   └── server-e2e/
├── libs/
│   └── api-interfaces/  ← Shared types: MessageService, Contact, User
├── nx.json
├── package.json
└── tsconfig.base.json
```

## Commands

```bash
nx serve client          # Run Angular frontend
nx serve server          # Run NestJS backend
nx run-many --target=serve --projects=client,server  # Run both
nx test client           # Test frontend
nx test server           # Test backend
nx generate @nx/angular:component <name> --project=client  # Generate Angular component
```

## Features to Implement

### Shared Interfaces (`@chat/api-interfaces`)
- `User` — id, name, avatar, status (online/offline)
- `Contact` — user info + online status
- `MessageService` — id, senderId, receiverId, text, timestamp
- DTOs for sending messages, connecting, etc.

### Backend (NestJS — `apps/server`)
- WebSocket gateway (SocketService.IO) for real-time messaging
- Manage contacts: name, avatar, status
- MessageService history (in-memory storage, no database needed)
- Handle user connect/disconnect events
- Bots logic (always online):
  - **Echo Bot** — responds with the exact same message immediately
  - **Reverse Bot** — responds with reversed message after 3-second delay
  - **Spam Bot** — ignores messages, sends random phrase every 10–120 seconds
  - **Ignore Bot** — does absolutely nothing

### Frontend (Angular — `apps/client`)
- UI must match the Figma layout (desktop: strict match, mobile: reasonable responsive adaptation)
- Messaging: send via "Send" button or Enter key. Prevent empty/whitespace-only messages.
- Visual distinction: different styles for "sent" vs "received" messages
- Navigation: switch between chat rooms/contacts
- Search: filter contacts by name
- Filtering: toggle between "All" contacts and "Online only"
- User persistence: first visit → generate random name + placeholder avatar, save to localStorage. Subsequent visits → retrieve from localStorage.
- Dynamic contacts: show all connected users (excluding self). New tab = new user appearing online.

### Monorepo & Shared Logic
- Shared library `@chat/api-interfaces` must contain all common interfaces and DTOs
- Both frontend and backend import from `@chat/api-interfaces` for end-to-end type safety

## Implementation Order

1. Define shared interfaces in `libs/api-interfaces/`
2. Build NestJS WebSocket gateway + bot logic in `apps/server/`
3. Build Angular UI + connect to WebSocket in `apps/client/`

## Evaluation Criteria (80% of hiring decision)

- **Project Structure:** Proper use of Nx libraries and NestJS modules
- **Code Quality:** Readability, comments, project structure
- **Reliability:** Edge cases and basic error management
- **Documentation:** Clear README.md with setup and launch instructions

## Code Style

- Use TypeScript strict mode
- Meaningful variable and function names
- Add comments for complex logic
- Follow Angular and NestJS conventions
- Keep components small and focused
