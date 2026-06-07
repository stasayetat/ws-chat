import { User } from '@chat/api-interfaces';
import { Test } from '@nestjs/testing';
import { Socket } from 'socket.io';

import { ChatService } from './chat.service';
import { ChatConnectionService } from './chat-connection.service';
import { UserSessionService } from './user/user-session.service';

const makeSocket = (auth: Record<string, unknown> = {}): jest.Mocked<Socket> =>
  ({
    id: 'socket-1',
    handshake: { auth },
    emit: jest.fn(),
    broadcast: { emit: jest.fn() },
    disconnect: jest.fn(),
  }) as unknown as jest.Mocked<Socket>;

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Alice',
  status: 'online',
  isBot: false,
  ...overrides,
});

describe('ChatConnectionService', () => {
  let service: ChatConnectionService;
  let chatService: jest.Mocked<
    Pick<ChatService, 'getUser' | 'addUser' | 'setUserStatus' | 'getContacts'>
  >;
  let sessionService: jest.Mocked<
    Pick<UserSessionService, 'register' | 'unregister'>
  >;

  beforeEach(async () => {
    chatService = {
      getUser: jest.fn(),
      addUser: jest.fn(),
      setUserStatus: jest.fn(),
      getContacts: jest.fn().mockReturnValue([]),
    };
    sessionService = { register: jest.fn(), unregister: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ChatConnectionService,
        { provide: ChatService, useValue: chatService },
        { provide: UserSessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get(ChatConnectionService);
  });

  describe('handleConnection', () => {
    it('disconnects a client that has no name in auth', () => {
      const client = makeSocket({});
      service.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(chatService.addUser).not.toHaveBeenCalled();
    });

    it('registers a new user and emits me + broadcasts userConnected', () => {
      const client = makeSocket({ name: 'Alice' });
      service.handleConnection(client);

      expect(chatService.addUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice',
          status: 'online',
          isBot: false,
        }),
      );
      expect(sessionService.register).toHaveBeenCalledWith(
        'socket-1',
        expect.any(String),
      );
      expect(client.emit).toHaveBeenCalledWith(
        'me',
        expect.objectContaining({ name: 'Alice' }),
      );
      expect(client.broadcast.emit).toHaveBeenCalledWith(
        'userConnected',
        expect.objectContaining({ name: 'Alice' }),
      );
    });

    it('reconnects an existing user when userId matches a known user', () => {
      const existing = makeUser({ status: 'offline' });
      chatService.getUser.mockReturnValue(existing);
      const client = makeSocket({ name: 'Alice', userId: 'user-1' });

      service.handleConnection(client);

      expect(chatService.addUser).not.toHaveBeenCalled();
      expect(chatService.setUserStatus).toHaveBeenCalledWith(
        'user-1',
        'online',
      );
      expect(sessionService.register).toHaveBeenCalledWith(
        'socket-1',
        'user-1',
      );
      expect(client.emit).toHaveBeenCalledWith(
        'me',
        expect.objectContaining({ id: 'user-1', status: 'online' }),
      );
      expect(client.broadcast.emit).toHaveBeenCalledWith('userStatusChanged', {
        id: 'user-1',
        status: 'online',
      });
    });

    it('registers as a new user when userId is provided but not found', () => {
      chatService.getUser.mockReturnValue(undefined);
      const client = makeSocket({ name: 'Alice', userId: 'stale-id' });

      service.handleConnection(client);

      expect(chatService.addUser).toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'me',
        expect.objectContaining({ name: 'Alice' }),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('returns null when the socket was not registered', () => {
      sessionService.unregister.mockReturnValue(undefined);
      expect(service.handleDisconnect(makeSocket())).toBeNull();
      expect(chatService.setUserStatus).not.toHaveBeenCalled();
    });

    it('marks the user offline and returns a status payload', () => {
      sessionService.unregister.mockReturnValue('user-1');
      const result = service.handleDisconnect(makeSocket());

      expect(chatService.setUserStatus).toHaveBeenCalledWith(
        'user-1',
        'offline',
      );
      expect(result).toEqual({ id: 'user-1', status: 'offline' });
    });
  });
});
