import { Message } from '@chat/api-interfaces';

import { EchoBot } from './echo.bot';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  senderId: 'user-1',
  receiverId: 'bot-echo',
  text: 'hello',
  timestamp: 0,
  ...overrides,
});

describe('EchoBot', () => {
  let bot: EchoBot;

  beforeEach(() => {
    bot = new EchoBot();
  });

  it('replies to the original sender with the same text', () => {
    const emit = jest.fn();
    bot.handleMessage(makeMessage(), emit);

    expect(emit).toHaveBeenCalledWith(
      'newMessage',
      expect.objectContaining({
        senderId: 'bot-echo',
        receiverId: 'user-1',
        text: 'hello',
      }),
    );
  });
});
