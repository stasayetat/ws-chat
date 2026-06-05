import { Module } from '@nestjs/common';

import { BotManagerService } from './bot-manager.service';
import { Bot } from './bots/bot.interface';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import {
  BOT_TOKEN,
  BOTS,
  MESSAGE_REPOSITORY,
  USER_REPOSITORY,
} from './chat.tokens';
import { MemoryMessageRepository } from './repositories/message.repository';
import { MemoryUserRepository } from './repositories/user.repository';
import { UserSessionService } from './user-session.service';

@Module({
  providers: [
    ChatGateway,
    ChatService,
    UserSessionService,
    BotManagerService,
    ...BOTS,
    { provide: BOT_TOKEN, useFactory: (...bots: Bot[]) => bots, inject: BOTS },
    { provide: USER_REPOSITORY, useClass: MemoryUserRepository },
    { provide: MESSAGE_REPOSITORY, useClass: MemoryMessageRepository },
  ],
})
export class ChatModule {}
