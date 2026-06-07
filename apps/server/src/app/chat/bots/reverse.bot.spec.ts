import { Message } from '@chat/api-interfaces';

import { ReverseBot } from './reverse.bot';

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  senderId: 'user-1',
  receiverId: 'bot-reverse',
  text: 'hello',
  timestamp: 0,
  ...overrides,
});

describe('ReverseBot', () => {
  let bot: ReverseBot;

  beforeEach(() => {
    jest.useFakeTimers();
    bot = new ReverseBot();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replies with reversed text after 3 seconds', async () => {
    const emit = jest.fn();
    const promise = bot.handleMessage(makeMessage({ text: 'hello' }), emit);
    await jest.advanceTimersByTimeAsync(3_000);
    await promise;

    expect(emit).toHaveBeenCalledWith(
      'newMessage',
      expect.objectContaining({
        senderId: 'bot-reverse',
        receiverId: 'user-1',
        text: 'olleh',
      }),
    );
  });

  it('sends reply to the original sender, not the bot', async () => {
    const emit = jest.fn();
    const promise = bot.handleMessage(
      makeMessage({ senderId: 'user-42' }),
      emit,
    );
    await jest.advanceTimersByTimeAsync(3_000);
    await promise;

    const [, reply] = emit.mock.calls[0] as [string, Message];
    expect(reply.receiverId).toBe('user-42');
    expect(reply.senderId).toBe('bot-reverse');
  });
});
