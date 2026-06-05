import { Message } from '@chat/api-interfaces';
import { Test } from '@nestjs/testing';

import { ChatService } from '../chat.service';
import { BOT_TOKEN } from '../chat.tokens';
import { Bot } from './bot.interface';
import { BotManagerService } from './bot-manager.service';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  senderId: 'user-1',
  receiverId: 'bot-echo',
  text: 'hello',
  timestamp: 0,
  ...overrides,
});

const makeBot = (
  id: string,
  name = id,
): Bot & { handleMessage: jest.Mock } => ({
  id,
  name,
  handleMessage: jest.fn(),
});

describe('BotManagerService', () => {
  let service: BotManagerService;
  let echoBot: Bot & { handleMessage: jest.Mock };
  let chatService: jest.Mocked<Pick<ChatService, 'addMessage' | 'addUser'>>;

  beforeEach(async () => {
    echoBot = makeBot('bot-echo');
    chatService = { addMessage: jest.fn(), addUser: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        BotManagerService,
        { provide: BOT_TOKEN, useValue: [echoBot, makeBot('bot-ignore')] },
        { provide: ChatService, useValue: chatService },
      ],
    }).compile();

    service = module.get(BotManagerService);
  });

  it('seeds bot users into ChatService on init', () => {
    service.onModuleInit();
    expect(chatService.addUser).toHaveBeenCalledTimes(2);
    expect(chatService.addUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bot-echo', status: 'online' }),
    );
  });

  it('detects registered bots', () => {
    expect(service.isBotId('bot-echo')).toBe(true);
    expect(service.isBotId('bot-ignore')).toBe(true);
  });

  it('returns false for unknown ids', () => {
    expect(service.isBotId('user-123')).toBe(false);
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
