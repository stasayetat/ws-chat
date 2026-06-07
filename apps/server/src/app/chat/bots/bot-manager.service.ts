import { Message } from '@chat/api-interfaces';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';

import { ChatService } from '../chat.service';
import { BOT_TOKEN } from '../chat.tokens';
import { Bot, EmitNewMessage } from './bot.interface';

@Injectable()
export class BotManagerService implements OnModuleInit {
  private readonly registry = new Map<string, Bot>();

  constructor(
    @Inject(BOT_TOKEN) bots: Bot[],
    private readonly chatService: ChatService,
  ) {
    for (const bot of bots) {
      this.registry.set(bot.id, bot);
    }
  }

  onModuleInit(): void {
    for (const bot of this.registry.values()) {
      this.chatService.addUser({
        id: bot.id,
        name: bot.name,
        status: 'online',
        isBot: true,
      });
    }
  }

  isBotId(id: string): boolean {
    return this.registry.has(id);
  }

  routeMessage(message: Message, emitToSender: EmitNewMessage): void {
    const bot = this.registry.get(message.receiverId);

    if (!bot) {
      return;
    }

    bot.handleMessage(message, (event, data) => {
      this.chatService.addMessage(data);
      emitToSender(event, data);
    });
  }
}
