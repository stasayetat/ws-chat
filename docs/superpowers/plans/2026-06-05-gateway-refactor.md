# Gateway Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `chat.gateway.ts` into focused single-responsibility units and make bots extensible via NestJS multi-provider injection.

**Architecture:** Extract `UserSessionService` (socket↔user maps) and `BotManagerService` (bot registry + routing) from the gateway. Bots become NestJS injectables registered via a multi-provider token — adding a new bot is one line in the module.

**Tech Stack:** NestJS, Socket.IO, Jest (`@nestjs/testing`)

---

## File Map

| File | Action |
|------|--------|
| `apps/server/src/app/chat/bots/spam.bot.ts` | Delete |
| `apps/server/src/app/chat/chat.service.ts` | Modify — remove SpamBot entries |
| `apps/server/src/app/chat/chat.gateway.ts` | Rewrite — remove spam lifecycle, delegate to new services |
| `apps/server/src/app/chat/chat.tokens.ts` | Create — exports `BOT_TOKEN` |
| `apps/server/src/app/chat/user-session.service.ts` | Create |
| `apps/server/src/app/chat/user-session.service.spec.ts` | Create |
| `apps/server/src/app/chat/bot-manager.service.ts` | Create |
| `apps/server/src/app/chat/bot-manager.service.spec.ts` | Create |
| `apps/server/src/app/chat/bots/echo.bot.ts` | Modify — add `@Injectable()` |
| `apps/server/src/app/chat/bots/reverse.bot.ts` | Modify — add `@Injectable()` |
| `apps/server/src/app/chat/bots/ignore.bot.ts` | Modify — add `@Injectable()` |
| `apps/server/src/app/chat/chat.module.ts` | Rewrite — multi-provider setup |

---

## Task 1: Remove SpamBot

**Files:**
- Delete: `apps/server/src/app/chat/bots/spam.bot.ts`
- Modify: `apps/server/src/app/chat/chat.service.ts`
- Modify: `apps/server/src/app/chat/chat.gateway.ts`

- [ ] **Step 1: Delete the spam bot file**

```bash
rm apps/server/src/app/chat/bots/spam.bot.ts
```

- [ ] **Step 2: Remove SpamBot from ChatService**

Open `apps/server/src/app/chat/chat.service.ts`. Replace the top section:

```typescript
import { Contact, Message, User } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';

const BOT_IDS = new Set(['bot-echo', 'bot-reverse', 'bot-ignore']);

const BOT_USERS: User[] = [
  { id: 'bot-echo', name: 'Echo Bot', avatar: '', status: 'online' },
  { id: 'bot-reverse', name: 'Reverse Bot', avatar: '', status: 'online' },
  { id: 'bot-ignore', name: 'Ignore Bot', avatar: '', status: 'online' },
];
```

- [ ] **Step 3: Clean SpamBot out of ChatGateway**

Replace `apps/server/src/app/chat/chat.gateway.ts` with this intermediate version (spam removed, old maps still in place — new services come in Task 7):

```typescript
import { Message, SendMessageDto, User } from '@chat/api-interfaces';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Bot } from './bots/bot.interface';
import { EchoBot } from './bots/echo.bot';
import { IgnoreBot } from './bots/ignore.bot';
import { ReverseBot } from './bots/reverse.bot';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: 'http://localhost:4200' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly socketToUser = new Map<string, string>();
  private readonly userToSocket = new Map<string, string>();

  private readonly echoBot = new EchoBot();
  private readonly reverseBot = new ReverseBot();
  private readonly ignoreBot = new IgnoreBot();
  private readonly bots = new Map<string, Bot>([
    [this.echoBot.id, this.echoBot],
    [this.reverseBot.id, this.reverseBot],
    [this.ignoreBot.id, this.ignoreBot],
  ]);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket): void {
    const auth: { name?: string; avatar?: string } = client.handshake.auth;

    if (!auth.name) {
      client.disconnect();
      return;
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: auth.name,
      avatar: auth.avatar ?? '',
      status: 'online',
    };

    this.chatService.addUser(user);
    this.socketToUser.set(client.id, user.id);
    this.userToSocket.set(user.id, client.id);

    client.emit('contactsList', this.chatService.getContacts(user.id));
    client.broadcast.emit('userConnected', user);
  }

  handleDisconnect(client: Socket): void {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    this.chatService.removeUser(userId);
    this.socketToUser.delete(client.id);
    this.userToSocket.delete(userId);

    this.server?.emit('userDisconnected', userId);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): void {
    if (!dto.text?.trim()) return;

    const senderId = this.socketToUser.get(client.id);
    if (!senderId) return;

    if (!this.bots.has(dto.receiverId) && !this.chatService.getUser(dto.receiverId)) return;

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      receiverId: dto.receiverId,
      text: dto.text,
      timestamp: Date.now(),
    };

    this.chatService.addMessage(message);

    const bot = this.bots.get(dto.receiverId);

    if (bot) {
      bot.handleMessage(message, (event, data) => {
        this.chatService.addMessage(data);
        client.emit(event, data);
      });
    } else {
      const receiverSocketId = this.userToSocket.get(dto.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      }
      client.emit('newMessage', message);
    }
  }
}
```

- [ ] **Step 4: Verify the server compiles**

```bash
nx build server
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app/chat/bots/spam.bot.ts apps/server/src/app/chat/chat.service.ts apps/server/src/app/chat/chat.gateway.ts
git commit -m "$(cat <<'EOF'
refactor: remove SpamBot

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create injection token

**Files:**
- Create: `apps/server/src/app/chat/chat.tokens.ts`

- [ ] **Step 1: Create the token file**

```typescript
// apps/server/src/app/chat/chat.tokens.ts
export const BOT_TOKEN = 'BOTS';
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app/chat/chat.tokens.ts
git commit -m "$(cat <<'EOF'
feat: add BOT_TOKEN injection token

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: UserSessionService — test then implement

**Files:**
- Create: `apps/server/src/app/chat/user-session.service.spec.ts`
- Create: `apps/server/src/app/chat/user-session.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/app/chat/user-session.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';

import { UserSessionService } from './user-session.service';

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserSessionService],
    }).compile();

    service = module.get(UserSessionService);
  });

  it('registers a session and resolves both directions', () => {
    service.register('socket-1', 'user-1');
    expect(service.getUserId('socket-1')).toBe('user-1');
    expect(service.getSocketId('user-1')).toBe('socket-1');
  });

  it('unregisters a session and returns the userId', () => {
    service.register('socket-1', 'user-1');
    const userId = service.unregister('socket-1');
    expect(userId).toBe('user-1');
    expect(service.getUserId('socket-1')).toBeUndefined();
    expect(service.getSocketId('user-1')).toBeUndefined();
  });

  it('returns undefined when unregistering an unknown socket', () => {
    expect(service.unregister('unknown-socket')).toBeUndefined();
  });

  it('returns all registered user ids', () => {
    service.register('socket-1', 'user-1');
    service.register('socket-2', 'user-2');
    expect(service.getAllUserIds()).toEqual(
      expect.arrayContaining(['user-1', 'user-2']),
    );
    expect(service.getAllUserIds()).toHaveLength(2);
  });

  it('overwrites a previous registration for the same socket', () => {
    service.register('socket-1', 'user-1');
    service.register('socket-1', 'user-2');
    expect(service.getUserId('socket-1')).toBe('user-2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nx test server --testFile=apps/server/src/app/chat/user-session.service.spec.ts
```

Expected: FAIL — `Cannot find module './user-session.service'`

- [ ] **Step 3: Implement UserSessionService**

Create `apps/server/src/app/chat/user-session.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserSessionService {
  private readonly socketToUser = new Map<string, string>();
  private readonly userToSocket = new Map<string, string>();

  register(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
  }

  unregister(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return undefined;

    this.socketToUser.delete(socketId);
    this.userToSocket.delete(userId);

    return userId;
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  getSocketId(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  getAllUserIds(): string[] {
    return [...this.userToSocket.keys()];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nx test server --testFile=apps/server/src/app/chat/user-session.service.spec.ts
```

Expected: 5 passing

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app/chat/user-session.service.ts apps/server/src/app/chat/user-session.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: add UserSessionService

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: BotManagerService — test then implement

**Files:**
- Create: `apps/server/src/app/chat/bot-manager.service.spec.ts`
- Create: `apps/server/src/app/chat/bot-manager.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/server/src/app/chat/bot-manager.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';

import { Message } from '@chat/api-interfaces';

import { Bot } from './bots/bot.interface';
import { BotManagerService } from './bot-manager.service';
import { ChatService } from './chat.service';
import { BOT_TOKEN } from './chat.tokens';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  senderId: 'user-1',
  receiverId: 'bot-echo',
  text: 'hello',
  timestamp: 0,
  ...overrides,
});

const makeBot = (id: string): Bot & { handleMessage: jest.Mock } => ({
  id,
  handleMessage: jest.fn(),
});

describe('BotManagerService', () => {
  let service: BotManagerService;
  let echoBot: Bot & { handleMessage: jest.Mock };
  let chatService: jest.Mocked<Pick<ChatService, 'addMessage'>>;

  beforeEach(async () => {
    echoBot = makeBot('bot-echo');
    chatService = { addMessage: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        BotManagerService,
        { provide: BOT_TOKEN, useValue: [echoBot, makeBot('bot-ignore')] },
        { provide: ChatService, useValue: chatService },
      ],
    }).compile();

    service = module.get(BotManagerService);
  });

  it('detects registered bots', () => {
    expect(service.hasBot('bot-echo')).toBe(true);
    expect(service.hasBot('bot-ignore')).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(service.hasBot('user-123')).toBe(false);
  });

  it('routes a message to the correct bot', () => {
    const emit = jest.fn();
    const message = makeMessage({ receiverId: 'bot-echo' });

    service.routeMessage(message, emit);

    expect(echoBot.handleMessage).toHaveBeenCalledWith(
      message,
      expect.any(Function),
    );
  });

  it('does nothing when bot is not found', () => {
    const emit = jest.fn();
    service.routeMessage(makeMessage({ receiverId: 'bot-unknown' }), emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it('persists bot reply via ChatService and emits it to sender', () => {
    const emit = jest.fn();
    const message = makeMessage({ receiverId: 'bot-echo' });
    const reply: Message = {
      id: 'reply-1',
      senderId: 'bot-echo',
      receiverId: 'user-1',
      text: 'hello',
      timestamp: 1,
    };

    echoBot.handleMessage.mockImplementation((_msg, emitFn) => {
      emitFn('newMessage', reply);
    });

    service.routeMessage(message, emit);

    expect(chatService.addMessage).toHaveBeenCalledWith(reply);
    expect(emit).toHaveBeenCalledWith('newMessage', reply);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
nx test server --testFile=apps/server/src/app/chat/bot-manager.service.spec.ts
```

Expected: FAIL — `Cannot find module './bot-manager.service'`

- [ ] **Step 3: Implement BotManagerService**

Create `apps/server/src/app/chat/bot-manager.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common';

import { Message } from '@chat/api-interfaces';

import { Bot, EmitFn } from './bots/bot.interface';
import { ChatService } from './chat.service';
import { BOT_TOKEN } from './chat.tokens';

@Injectable()
export class BotManagerService {
  private readonly registry = new Map<string, Bot>();

  constructor(
    @Inject(BOT_TOKEN) bots: Bot[],
    private readonly chatService: ChatService,
  ) {
    for (const bot of bots) {
      this.registry.set(bot.id, bot);
    }
  }

  hasBot(id: string): boolean {
    return this.registry.has(id);
  }

  routeMessage(message: Message, emitToSender: EmitFn): void {
    const bot = this.registry.get(message.receiverId);
    if (!bot) return;

    bot.handleMessage(message, (event, data) => {
      this.chatService.addMessage(data);
      emitToSender(event, data);
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
nx test server --testFile=apps/server/src/app/chat/bot-manager.service.spec.ts
```

Expected: 5 passing

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/app/chat/bot-manager.service.ts apps/server/src/app/chat/bot-manager.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: add BotManagerService

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Make bots NestJS injectables

**Files:**
- Modify: `apps/server/src/app/chat/bots/echo.bot.ts`
- Modify: `apps/server/src/app/chat/bots/reverse.bot.ts`
- Modify: `apps/server/src/app/chat/bots/ignore.bot.ts`

- [ ] **Step 1: Add @Injectable() to EchoBot**

Replace `apps/server/src/app/chat/bots/echo.bot.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import { Message } from '@chat/api-interfaces';

import { Bot, EmitFn } from './bot.interface';

@Injectable()
export class EchoBot implements Bot {
  readonly id = 'bot-echo';

  handleMessage(message: Message, emit: EmitFn): void {
    const reply: Message = {
      id: crypto.randomUUID(),
      senderId: this.id,
      receiverId: message.senderId,
      text: message.text,
      timestamp: Date.now(),
    };
    emit('newMessage', reply);
  }
}
```

- [ ] **Step 2: Add @Injectable() to ReverseBot**

Replace `apps/server/src/app/chat/bots/reverse.bot.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import { Message } from '@chat/api-interfaces';

import { Bot, EmitFn } from './bot.interface';

@Injectable()
export class ReverseBot implements Bot {
  readonly id = 'bot-reverse';

  handleMessage(message: Message, emit: EmitFn): void {
    setTimeout(() => {
      const reply: Message = {
        id: crypto.randomUUID(),
        senderId: this.id,
        receiverId: message.senderId,
        text: message.text.split('').reverse().join(''),
        timestamp: Date.now(),
      };
      emit('newMessage', reply);
    }, 3000);
  }
}
```

- [ ] **Step 3: Add @Injectable() to IgnoreBot**

Replace `apps/server/src/app/chat/bots/ignore.bot.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import { Message } from '@chat/api-interfaces';

import { Bot, EmitFn } from './bot.interface';

@Injectable()
export class IgnoreBot implements Bot {
  readonly id = 'bot-ignore';

  handleMessage(_message: Message, _emit: EmitFn): void {
    /* empty */
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app/chat/bots/echo.bot.ts apps/server/src/app/chat/bots/reverse.bot.ts apps/server/src/app/chat/bots/ignore.bot.ts
git commit -m "$(cat <<'EOF'
refactor: make bots NestJS injectables

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update ChatModule with multi-provider setup

**Files:**
- Modify: `apps/server/src/app/chat/chat.module.ts`

- [ ] **Step 1: Rewrite ChatModule**

Replace `apps/server/src/app/chat/chat.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { EchoBot } from './bots/echo.bot';
import { IgnoreBot } from './bots/ignore.bot';
import { ReverseBot } from './bots/reverse.bot';
import { BotManagerService } from './bot-manager.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { BOT_TOKEN } from './chat.tokens';
import { UserSessionService } from './user-session.service';

@Module({
  providers: [
    ChatGateway,
    ChatService,
    UserSessionService,
    BotManagerService,
    { provide: BOT_TOKEN, useClass: EchoBot, multi: true },
    { provide: BOT_TOKEN, useClass: ReverseBot, multi: true },
    { provide: BOT_TOKEN, useClass: IgnoreBot, multi: true },
  ],
})
export class ChatModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app/chat/chat.module.ts
git commit -m "$(cat <<'EOF'
refactor: wire multi-provider bots in ChatModule

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Slim down ChatGateway

**Files:**
- Modify: `apps/server/src/app/chat/chat.gateway.ts`

- [ ] **Step 1: Rewrite ChatGateway to delegate to new services**

Replace `apps/server/src/app/chat/chat.gateway.ts`:

```typescript
import { Message, SendMessageDto, User } from '@chat/api-interfaces';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { BotManagerService } from './bot-manager.service';
import { ChatService } from './chat.service';
import { UserSessionService } from './user-session.service';

@WebSocketGateway({ cors: { origin: 'http://localhost:4200' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: UserSessionService,
    private readonly botManager: BotManagerService,
  ) {}

  handleConnection(client: Socket): void {
    const auth: { name?: string; avatar?: string } = client.handshake.auth;

    if (!auth.name) {
      client.disconnect();
      return;
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: auth.name,
      avatar: auth.avatar ?? '',
      status: 'online',
    };

    this.chatService.addUser(user);
    this.sessionService.register(client.id, user.id);

    client.emit('contactsList', this.chatService.getContacts(user.id));
    client.broadcast.emit('userConnected', user);
  }

  handleDisconnect(client: Socket): void {
    const userId = this.sessionService.unregister(client.id);
    if (!userId) return;

    this.chatService.removeUser(userId);
    this.server?.emit('userDisconnected', userId);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): void {
    if (!dto.text?.trim()) return;

    const senderId = this.sessionService.getUserId(client.id);
    if (!senderId) return;

    if (!this.botManager.hasBot(dto.receiverId) && !this.chatService.getUser(dto.receiverId)) return;

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      receiverId: dto.receiverId,
      text: dto.text,
      timestamp: Date.now(),
    };

    this.chatService.addMessage(message);

    if (this.botManager.hasBot(dto.receiverId)) {
      this.botManager.routeMessage(message, (event, data) => client.emit(event, data));
    } else {
      const receiverSocketId = this.sessionService.getSocketId(dto.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('newMessage', message);
      }
      client.emit('newMessage', message);
    }
  }
}
```

- [ ] **Step 2: Build to confirm no type errors**

```bash
nx build server
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Run all server tests**

```bash
nx test server
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/app/chat/chat.gateway.ts
git commit -m "$(cat <<'EOF'
refactor: slim down ChatGateway, delegate to UserSessionService and BotManagerService

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Smoke test

- [ ] **Step 1: Start the server**

```bash
nx serve server
```

Expected: server starts on port 3000 with no errors in the console.

- [ ] **Step 2: Verify bot contacts appear**

Open the client app (or connect via a WebSocket client) and confirm Echo Bot, Reverse Bot, and Ignore Bot appear in the contacts list. Spam Bot should not appear.

- [ ] **Step 3: Verify Echo Bot responds**

Send a message to Echo Bot. Expected: the same message is returned immediately.

- [ ] **Step 4: Verify Reverse Bot responds**

Send a message to Reverse Bot. Expected: the reversed text is returned after ~3 seconds.

- [ ] **Step 5: Verify Ignore Bot is silent**

Send a message to Ignore Bot. Expected: no reply.
