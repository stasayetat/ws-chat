import { GetHistoryDto, Message, SendMessageDto } from '@chat/api-interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

import { BotManagerService } from './bots/bot-manager.service';
import { SpamBot } from './bots/spam.bot';
import { ChatService } from './chat.service';
import { UserSessionService } from './user/user-session.service';

@Injectable()
export class ChatMessageService {
  private readonly logger = new Logger(ChatMessageService.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: UserSessionService,
    private readonly botManager: BotManagerService,
    private readonly spamBot: SpamBot,
  ) {}

  startSpamBot(emitTo: (socketId: string, msg: Message) => void) {
    return this.spamBot.start(
      () => this.sessionService.getAllUserIds(),
      this.createMessageSender(emitTo),
    );
  }

  handleGetContacts(client: Socket): void {
    const userId = this.sessionService.getUserId(client.id);

    if (!userId) {
      return;
    }

    client.emit('contactsList', this.chatService.getContacts(userId));
  }

  handleGetHistory(client: Socket, dto: GetHistoryDto): void {
    const userId = this.sessionService.getUserId(client.id);

    if (!userId) {
      return;
    }

    const messages = this.chatService.getHistory(userId, dto.contactId);
    client.emit('history', { contactId: dto.contactId, messages });
  }

  processMessage(
    client: Socket,
    dto: SendMessageDto,
  ): { message: Message; receiverSocketId?: string } | null {
    if (!dto.text?.trim()) {
      return null;
    }

    const senderId = this.sessionService.getUserId(client.id);

    if (!senderId || !this.isValidReceiverId(dto.receiverId)) {
      return null;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      receiverId: dto.receiverId,
      text: dto.text,
      timestamp: Date.now(),
    };

    this.chatService.addMessage(message);
    this.logger.log(`Message from ${senderId} to ${dto.receiverId}`);

    if (this.botManager.isBotId(message.receiverId)) {
      return this.processMessageToBot(client, message);
    }

    return {
      message,
      receiverSocketId: this.sessionService.getSocketId(message.receiverId),
    };
  }

  private processMessageToBot = (client: Socket, message: Message) => {
    client.emit('newMessage', message);
    this.botManager.routeMessage(message, (event, data) =>
      client.emit(event, data),
    );

    return null;
  };

  private isValidReceiverId(receiverId: string): boolean {
    return (
      this.botManager.isBotId(receiverId) ||
      !!this.chatService.getUser(receiverId)
    );
  }

  private createMessageSender(emitTo: {
    (socketId: string, msg: Message): void;
  }) {
    return (receiverId: string, msg: Message) => {
      this.chatService.addMessage(msg);
      const socketId = this.sessionService.getSocketId(receiverId);

      if (socketId) {
        emitTo(socketId, msg);
      }
    };
  }
}
