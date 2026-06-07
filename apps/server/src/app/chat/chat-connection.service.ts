import {
  HandshakeAuthDto,
  User,
  UserStatusChangedDto,
} from '@chat/api-interfaces';
import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

import { ChatService } from './chat.service';
import { UserSessionService } from './user/user-session.service';

@Injectable()
export class ChatConnectionService {
  private readonly logger = new Logger(ChatConnectionService.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: UserSessionService,
  ) {}

  handleConnection(client: Socket): void {
    const auth: HandshakeAuthDto = client.handshake.auth;

    if (!auth.name) {
      this.logger.error(
        `Connection rejected: missing auth (socket ${client.id})`,
      );
      client.disconnect();

      return;
    }

    const existingUser = auth.userId
      ? this.chatService.getUser(auth.userId)
      : undefined;

    if (existingUser) {
      this.reconnectUser(existingUser, client);

      return;
    }

    this.registerNewUser(auth, client);
  }

  handleDisconnect(client: Socket): UserStatusChangedDto | null {
    const userId = this.sessionService.unregister(client.id);

    if (!userId) {
      return null;
    }

    this.chatService.setUserStatus(userId, 'offline');
    this.logger.log(`User disconnected: ${userId}`);

    return { id: userId, status: 'offline' };
  }

  private registerNewUser(auth: HandshakeAuthDto, client: Socket): void {
    const user: User = {
      id: crypto.randomUUID(),
      name: auth.name,
      avatar: auth.avatar,
      status: 'online',
      isBot: false,
    };

    this.chatService.addUser(user);
    this.sessionService.register(client.id, user.id);
    this.logger.log(`User registered: ${user.name} ${user.id}`);

    client.emit('me', user);
    client.broadcast.emit('userConnected', user);
  }

  private reconnectUser(existingUser: User, client: Socket): void {
    this.chatService.setUserStatus(existingUser.id, 'online');
    this.sessionService.register(client.id, existingUser.id);
    this.logger.log(
      `User reconnected: ${existingUser.name} ${existingUser.id}`,
    );

    const reconnectedUser: User = { ...existingUser, status: 'online' };
    client.emit('contactsList', this.chatService.getContacts(existingUser.id));
    client.emit('me', reconnectedUser);

    client.broadcast.emit('userStatusChanged', {
      id: existingUser.id,
      status: 'online',
    });
  }
}
