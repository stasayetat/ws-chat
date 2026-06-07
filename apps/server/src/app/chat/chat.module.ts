import { Module } from '@nestjs/common';

import { Bot } from './bots/bot.interface';
import { BotManagerService } from './bots/bot-manager.service';
import { ChatConnectionService } from './chat-connection.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessageService } from './chat-message.service';
import { ChatService } from './chat.service';
import {
  BOT_TOKEN,
  BOTS,
  MESSAGE_REPOSITORY,
  USER_REPOSITORY,
} from './chat.tokens';
import { MemoryMessageRepository } from './message/message.repository';
import { MemoryUserRepository } from './user/user.repository';
import { UserSessionService } from './user/user-session.service';

@Module({
  providers: [
    ChatGateway,
    ChatConnectionService,
    ChatMessageService,
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
