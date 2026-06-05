import { Message } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';

import { Bot, EmitNewMessage } from './bot.interface';

@Injectable()
export class EchoBot implements Bot {
  readonly id = 'bot-echo';
  readonly name = 'Echo Bot';

  handleMessage(message: Message, emit: EmitNewMessage): void {
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
