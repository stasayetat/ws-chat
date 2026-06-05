import { Message } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';

import { Bot, EmitNewMessage } from './bot.interface';

@Injectable()
export class IgnoreBot implements Bot {
  readonly id = 'bot-ignore';
  readonly name = 'Ignore Bot';

  handleMessage(_message: Message, _emit: EmitNewMessage): void {
    /* empty */
  }
}
