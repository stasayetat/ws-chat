# Gateway Refactor Design — 2026-06-05

## Goal

Split `chat.gateway.ts` into focused, single-responsibility units. Make bots extensible via NestJS multi-provider injection so adding a new bot requires only one line in the module.

SpamBot is removed entirely.

---

## Architecture

### Files changed

| File | Action |
|------|--------|
| `chat/chat.gateway.ts` | Slim down to ~50 lines — only WebSocket event handlers |
| `chat/chat.service.ts` | No changes |
| `chat/chat.module.ts` | Add multi-provider token + new services |
| `chat/user-session.service.ts` | New — owns socket↔user bidirectional maps |
| `chat/bot-manager.service.ts` | New — bot registry and message routing |
| `chat/bots/bot.interface.ts` | No changes |
| `chat/bots/echo.bot.ts` | Add `@Injectable()` |
| `chat/bots/reverse.bot.ts` | Add `@Injectable()` |
| `chat/bots/ignore.bot.ts` | Add `@Injectable()` |
| `chat/bots/spam.bot.ts` | Deleted |

---

## Components

### `UserSessionService`

Owns the two bidirectional maps (`socketId ↔ userId`). All session lookups and mutations go through this service — the gateway never touches a raw Map.

```
register(socketId: string, user: User): void
unregister(socketId: string): void
getUserId(socketId: string): string | undefined
getSocketId(userId: string): string | undefined
getAllUserIds(): string[]
```

### `BotManagerService`

Receives all bots via `@Inject(BOT_TOKEN)`. Builds an internal `Map<id, Bot>` at construction. Exposes two methods the gateway calls:

```
hasBot(id: string): boolean
routeMessage(message: Message, emitToSender: EmitFn): void
```

`routeMessage` looks up the bot by `message.receiverId`, calls `bot.handleMessage`, and also persists the bot's reply via `ChatService.addMessage` (injected).

### `ChatGateway` (slimmed)

Only three responsibilities: handle `connection`, handle `disconnect`, handle `sendMessage` event. Delegates everything else.

```
handleConnection  → auth check → UserSessionService.register → ChatService.addUser → broadcast
handleDisconnect  → UserSessionService.unregister → ChatService.removeUser → broadcast
handleSendMessage → validate → BotManagerService.hasBot?
                    yes → BotManagerService.routeMessage
                    no  → UserSessionService.getSocketId → server.to(socket).emit
```

### `ChatModule`

```typescript
export const BOT_TOKEN = 'BOTS';

@Module({
  providers: [
    ChatGateway,
    ChatService,
    UserSessionService,
    BotManagerService,
    { provide: BOT_TOKEN, useClass: EchoBot, multi: true },
    { provide: BOT_TOKEN, useClass: ReverseBot, multi: true },
    { provide: BOT_TOKEN, useClass: IgnoreBot, multi: true },
    // new bot = add one line here
  ],
})
export class ChatModule {}
```

Adding a new bot = one new `useClass` line. Nothing else changes.

---

## Data Flow

### User connects
```
Socket connect → gateway.handleConnection
  → UserSessionService.register(socketId, user)
  → ChatService.addUser(user)
  → client.emit('contactsList', ...)
  → client.broadcast.emit('userConnected', user)
```

### Message to bot
```
client.emit('sendMessage', dto) → gateway.handleSendMessage
  → ChatService.addMessage(message)
  → BotManagerService.routeMessage(message, emit)
      → bot.handleMessage(message, emit)
          → ChatService.addMessage(reply)
          → client.emit('newMessage', reply)
```

### Message to real user
```
client.emit('sendMessage', dto) → gateway.handleSendMessage
  → ChatService.addMessage(message)
  → UserSessionService.getSocketId(receiverId)
  → server.to(receiverSocket).emit('newMessage', message)
  → client.emit('newMessage', message)
```

### User disconnects
```
Socket disconnect → gateway.handleDisconnect
  → UserSessionService.unregister(socketId)
  → ChatService.removeUser(userId)
  → server.emit('userDisconnected', userId)
```

---

## Extensibility

To add a new bot:
1. Create `bots/my-new.bot.ts` with `@Injectable()` implementing `Bot`
2. Add `{ provide: BOT_TOKEN, useClass: MyNewBot, multi: true }` to `ChatModule`

No other files need to change.

---

## Out of Scope

- Message history API endpoint
- Tests (separate task)
