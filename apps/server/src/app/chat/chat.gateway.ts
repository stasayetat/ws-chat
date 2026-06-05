import {
  GetHistoryDto,
  Message,
  SendMessageDto,
  User,
  UserStatusChangedDto,
} from '@chat/api-interfaces';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { env } from '../env';
import { BotManagerService } from './bot-manager.service';
import { SpamBot } from './bots/spam.bot';
import { ChatService } from './chat.service';
import { UserSessionService } from './user-session.service';

@WebSocketGateway({ cors: { origin: env.CLIENT_URL } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: UserSessionService,
    private readonly botManager: BotManagerService,
    private readonly spamBot: SpamBot,
  ) {}

  afterInit(): void {
    void this.spamBot.start(
      () => this.sessionService.getAllUserIds(),
      (receiverId, msg) => {
        this.chatService.addMessage(msg);
        const socketId = this.sessionService.getSocketId(receiverId);

        if (socketId) {
          this.server.to(socketId).emit('newMessage', msg);
        }
      },
    );
  }

  handleConnection(client: Socket): void {
    const auth: { name?: string; avatar?: string } = client.handshake.auth;

    if (!auth.name) {
      client.disconnect();

      return;
    }

    const user: User = {
      id: crypto.randomUUID(),
      name: auth.name,
      avatar: auth.avatar ?? '',
      status: 'online',
    };

    this.chatService.addUser(user);
    this.sessionService.register(client.id, user.id);

    client.emit('contactsList', this.chatService.getContacts(user.id));
    client.broadcast.emit('userConnected', user);
  }

  handleDisconnect(client: Socket): void {
    const userId = this.sessionService.unregister(client.id);

    if (!userId) {
      return;
    }

    this.chatService.setUserStatus(userId, 'offline');

    const payload: UserStatusChangedDto = { id: userId, status: 'offline' };
    this.server.emit('userStatusChanged', payload);
  }

  @SubscribeMessage('getHistory')
  handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GetHistoryDto,
  ): void {
    const userId = this.sessionService.getUserId(client.id);

    if (!userId || !dto.contactId) {
      return;
    }

    const messages = this.chatService.getHistory(userId, dto.contactId);
    client.emit('history', { contactId: dto.contactId, messages });
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): void {
    if (!dto.text?.trim()) {
      return;
    }

    const senderId = this.sessionService.getUserId(client.id);

    if (!senderId) {
      return;
    }

    if (!this.isValidReceiver(dto.receiverId)) {
      return;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      senderId,
      receiverId: dto.receiverId,
      text: dto.text,
      timestamp: Date.now(),
    };

    this.chatService.addMessage(message);
    this.deliverMessage(client, message);
  }

  private isValidReceiver(receiverId: string): boolean {
    return (
      this.botManager.isBotId(receiverId) ||
      !!this.chatService.getUser(receiverId)
    );
  }

  private deliverMessage(client: Socket, message: Message): void {
    if (this.botManager.isBotId(message.receiverId)) {
      this.processBotMessage(message, client);
    } else {
      this.processUserMessage(message, client);
    }
  }

  private processUserMessage = (message: Message, client: Socket) => {
    const receiverSocketId = this.sessionService.getSocketId(
      message.receiverId,
    );

    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('newMessage', message);
    }

    client.emit('newMessage', message);
  };

  private processBotMessage = (message: Message, client: Socket) => {
    this.botManager.routeMessage(message, (event, data) =>
      client.emit(event, data),
    );
  };
}
