import { Message, User } from '@chat/api-interfaces';
import { Test } from '@nestjs/testing';
import { Socket } from 'socket.io';

import { BotManagerService } from './bots/bot-manager.service';
import { SpamBot } from './bots/spam.bot';
import { ChatService } from './chat.service';
import { ChatMessageService } from './chat-message.service';
import { UserSessionService } from './user/user-session.service';

const makeSocket = (): jest.Mocked<Socket> =>
  ({
    id: 'socket-1',
    emit: jest.fn(),
  }) as unknown as jest.Mocked<Socket>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-2',
  name: 'Bob',
  status: 'online',
  isBot: false,
  ...overrides,
});

describe('ChatMessageService', () => {
  let service: ChatMessageService;
  let chatService: jest.Mocked<
    Pick<ChatService, 'getUser' | 'addMessage' | 'getHistory' | 'getContacts'>
  >;
  let sessionService: jest.Mocked<
    Pick<UserSessionService, 'getUserId' | 'getSocketId' | 'getAllUserIds'>
  >;
  let botManager: jest.Mocked<
    Pick<BotManagerService, 'isBotId' | 'routeMessage'>
  >;

  beforeEach(async () => {
    chatService = {
      getUser: jest.fn(),
      addMessage: jest.fn(),
      getHistory: jest.fn().mockReturnValue([]),
      getContacts: jest.fn().mockReturnValue([]),
    };
    sessionService = {
      getUserId: jest.fn(),
      getSocketId: jest.fn(),
      getAllUserIds: jest.fn().mockReturnValue([]),
    };
    botManager = {
      isBotId: jest.fn().mockReturnValue(false),
      routeMessage: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChatMessageService,
        { provide: ChatService, useValue: chatService },
        { provide: UserSessionService, useValue: sessionService },
        { provide: BotManagerService, useValue: botManager },
        { provide: SpamBot, useValue: { start: jest.fn() } },
      ],
    }).compile();

    service = module.get(ChatMessageService);
  });

  describe('processMessage', () => {
    it('returns null for empty text', () => {
      expect(
        service.processMessage(makeSocket(), {
          receiverId: 'user-2',
          text: '',
        }),
      ).toBeNull();
    });

    it('returns null for whitespace-only text', () => {
      expect(
        service.processMessage(makeSocket(), {
          receiverId: 'user-2',
          text: '   ',
        }),
      ).toBeNull();
    });

    it('returns null when sender has no session', () => {
      sessionService.getUserId.mockReturnValue(undefined);
      expect(
        service.processMessage(makeSocket(), {
          receiverId: 'user-2',
          text: 'hi',
        }),
      ).toBeNull();
    });

    it('returns null when receiver is unknown', () => {
      sessionService.getUserId.mockReturnValue('user-1');
      botManager.isBotId.mockReturnValue(false);
      chatService.getUser.mockReturnValue(undefined);
      expect(
        service.processMessage(makeSocket(), {
          receiverId: 'ghost',
          text: 'hi',
        }),
      ).toBeNull();
    });

    it('returns message and receiverSocketId for a valid user-to-user message', () => {
      sessionService.getUserId.mockReturnValue('user-1');
      botManager.isBotId.mockReturnValue(false);
      chatService.getUser.mockReturnValue(makeUser());
      sessionService.getSocketId.mockReturnValue('socket-2');

      const result = service.processMessage(makeSocket(), {
        receiverId: 'user-2',
        text: 'hi',
      });

      expect(result).not.toBeNull();
      expect(result?.message).toMatchObject({
        senderId: 'user-1',
        receiverId: 'user-2',
        text: 'hi',
      });
      expect(result?.receiverSocketId).toBe('socket-2');
      expect(chatService.addMessage).toHaveBeenCalledWith(result?.message);
    });

    it('returns null and emits newMessage + routes to bot for a bot receiver', () => {
      sessionService.getUserId.mockReturnValue('user-1');
      botManager.isBotId.mockReturnValue(true);
      const client = makeSocket();

      const result = service.processMessage(client, {
        receiverId: 'bot-echo',
        text: 'hi',
      });

      expect(result).toBeNull();
      expect(client.emit).toHaveBeenCalledWith(
        'newMessage',
        expect.objectContaining({ senderId: 'user-1', receiverId: 'bot-echo' }),
      );
      expect(botManager.routeMessage).toHaveBeenCalled();
    });
  });

  describe('handleGetContacts', () => {
    it('emits contactsList for a registered session', () => {
      const client = makeSocket();
      sessionService.getUserId.mockReturnValue('user-1');
      chatService.getContacts.mockReturnValue([makeUser()]);

      service.handleGetContacts(client);

      expect(client.emit).toHaveBeenCalledWith('contactsList', [makeUser()]);
    });

    it('does nothing when session is missing', () => {
      const client = makeSocket();
      sessionService.getUserId.mockReturnValue(undefined);

      service.handleGetContacts(client);

      expect(client.emit).not.toHaveBeenCalled();
    });
  });

  describe('handleGetHistory', () => {
    it('emits history for a registered session', () => {
      const client = makeSocket();
      sessionService.getUserId.mockReturnValue('user-1');
      const messages: Message[] = [
        {
          id: 'm1',
          senderId: 'user-1',
          receiverId: 'user-2',
          text: 'hi',
          timestamp: 1,
        },
      ];
      chatService.getHistory.mockReturnValue(messages);

      service.handleGetHistory(client, { contactId: 'user-2' });

      expect(client.emit).toHaveBeenCalledWith('history', {
        contactId: 'user-2',
        messages,
      });
    });

    it('does nothing when session is missing', () => {
      const client = makeSocket();
      sessionService.getUserId.mockReturnValue(undefined);

      service.handleGetHistory(client, { contactId: 'user-2' });

      expect(client.emit).not.toHaveBeenCalled();
    });
  });
});
