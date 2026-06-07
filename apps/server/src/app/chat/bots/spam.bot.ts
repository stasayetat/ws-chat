import { Message } from '@chat/api-interfaces';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import _ from 'lodash';
import { setTimeout } from 'timers/promises';

import { randomizedDelay } from '../chat.utils';
import { Bot, EmitNewMessage } from './bot.interface';

const PHRASES = [
  'Spam Text 1',
  'Spam Text 2',
  'Spam Text 3',
  'Spam Text 4',
  'Spam Text 5',
];

@Injectable()
export class SpamBot implements Bot, OnModuleDestroy {
  readonly id = 'bot-spam';
  readonly name = 'Spam Bot';

  private running = true;

  handleMessage(_message: Message, _emit: EmitNewMessage): void {
    /* empty */
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  async start(
    getRecipients: () => string[],
    send: (receiverId: string, msg: Message) => void,
  ): Promise<void> {
    while (this.running) {
      await setTimeout(randomizedDelay(10_000, 120_000));

      if (!this.running) {
        break;
      }

      const recipients = getRecipients();

      if (!recipients.length) {
        continue;
      }

      const receiverId = _.sample(recipients);
      const text = _.sample(PHRASES);

      Logger.log(`Sending ${receiverId}: ${text}`);

      send(receiverId, {
        id: crypto.randomUUID(),
        senderId: this.id,
        receiverId,
        text,
        timestamp: Date.now(),
      });
    }
  }
}
