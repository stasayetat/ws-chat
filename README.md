# Chat

A real-time chat web application

## Tech Stack

- **Monorepo:** Nx
- **Frontend:** Angular 21
- **Backend:** NestJS 11
- **Real-time:** Socket.IO (WebSocket)

## Requirements

- Node.js 22+
- npm 10+

## Setup

```bash
git clone https://github.com/stasayetat/ws-chat.git
cd ws-chat/chat
npm install
```

## Environment

The server reads config from `profiles/.env`. Defaults work out of the box:

```
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:4200
```

## Running

**Both apps at once:**
```bash
npx nx run-many --target=serve --projects=client,server
```

**Client Side:**
```bash
npx nx serve client   # http://localhost:4200
```

**Server Side:**
```bash
npx nx serve server   # http://localhost:3000
```

## Testing

**Server Side:**
```bash
npx nx test server
```

## Project Structure

```
apps/
  client/          # Angular frontend
  server/          # NestJS backend
libs/
  api-interfaces/  # Shared interfaces and DTOs
profiles/
  .env             # Environment config for the server
```

## Features

### Messaging
- Real-time messaging via WebSocket
- Send with the **Send** button or **Enter** key
- Empty/whitespace-only messages are blocked
- Sent messages appear on the right (purple), received on the left (grey)
- Message history is loaded when opening a conversation

### Contacts
- All connected users appear in the contact list
- Online/offline status updates in real time
- Search contacts by name
- Filter between **All** and **Online only**
- Opening a new browser tab creates a new user and they appear in everyone's list

### User Identity
- On first visit a random name (`User1234`) is generated and saved to `sessionStorage`
- On refresh or reconnect the same identity is restored — message history is preserved

### Bots (always online)
| Bot | Behaviour |
|---|---|
| Echo Bot | Replies with the exact same message |
| Reverse Bot | Replies with the reversed text after a 3s delay |
| Spam Bot | Sends a random phrase every 10–120s to a random user |
| Ignore Bot | Never replies |
