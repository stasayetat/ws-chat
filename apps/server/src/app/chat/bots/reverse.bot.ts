import { Message } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import { Bot, EmitNewMessage } from './bot.interface';

@Injectable()
export class ReverseBot implements Bot {
  readonly id = 'bot-reverse';
  readonly name = 'Reverse Bot';

  async handleMessage(message: Message, emit: EmitNewMessage) {
    await setTimeout(3_000);

    const reply: Message = {
      id: crypto.randomUUID(),
      senderId: this.id,
      receiverId: message.senderId,
      text: message.text.split('').reverse().join(''),
      timestamp: Date.now(),
    };
    emit('newMessage', reply);
  }
}
