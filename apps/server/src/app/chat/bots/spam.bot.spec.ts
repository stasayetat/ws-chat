import { Message } from '@chat/api-interfaces';
import { setTimeout as timersSetTimeout } from 'timers/promises';

import { SpamBot } from './spam.bot';

jest.mock('../chat.utils', () => ({
  randomizedDelay: jest.fn().mockReturnValue(10_000),
}));
jest.mock('timers/promises', () => ({ setTimeout: jest.fn() }));

const mockSetTimeout = timersSetTimeout as jest.Mock;

describe('SpamBot', () => {
  let bot: SpamBot;
  let timerResolve: () => void;

  beforeEach(() => {
    bot = new SpamBot();
    mockSetTimeout.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          timerResolve = resolve;
        }),
    );
  });

  afterEach(() => {
    bot.onModuleDestroy();
    timerResolve?.();
  });

  it('handleMessage never emits', () => {
    const emit = jest.fn();
    const msg: Message = {
      id: '1',
      senderId: 'u',
      receiverId: 'bot-spam',
      text: 'hi',
      timestamp: 0,
    };
    bot.handleMessage(msg, emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it('sends a spam message to a recipient after the delay', async () => {
    const send = jest.fn();
    const promise = bot.start(() => ['user-1'], send);

    timerResolve();
    await Promise.resolve();

    expect(send).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ senderId: 'bot-spam', receiverId: 'user-1' }),
    );

    bot.onModuleDestroy();
    timerResolve();
    await Promise.resolve();
    await promise;
  });

  it('skips sending when there are no recipients', async () => {
    const send = jest.fn();
    const promise = bot.start(() => [], send);

    timerResolve();
    await Promise.resolve();

    expect(send).not.toHaveBeenCalled();

    bot.onModuleDestroy();
    timerResolve();
    await Promise.resolve();
    await promise;
  });

  it('stops the loop after onModuleDestroy', async () => {
    const send = jest.fn();
    const promise = bot.start(() => ['user-1'], send);

    bot.onModuleDestroy();
    timerResolve();
    await Promise.resolve();
    await promise;

    expect(send).not.toHaveBeenCalled();
  });
});
