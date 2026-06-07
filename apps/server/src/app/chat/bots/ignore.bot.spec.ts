import { Message } from '@chat/api-interfaces';

import { IgnoreBot } from './ignore.bot';

describe('IgnoreBot', () => {
  it('never emits regardless of the message received', () => {
    const bot = new IgnoreBot();
    const emit = jest.fn();
    const message: Message = {
      id: 'msg-1',
      senderId: 'user-1',
      receiverId: 'bot-ignore',
      text: 'hello',
      timestamp: 0,
    };

    bot.handleMessage(message, emit);

    expect(emit).not.toHaveBeenCalled();
  });
});
