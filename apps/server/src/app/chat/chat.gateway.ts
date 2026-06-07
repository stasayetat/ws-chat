import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { env } from '../env';
import { ChatConnectionService } from './chat-connection.service';
import { ChatMessageService } from './chat-message.service';
import { GetHistoryDtoValidated } from './dtos/get-history.dto';
import { SendMessageDtoValidated } from './dtos/send-message.dto';
import { WsExceptionFilter } from './filters/ws-exception.filter';

@UseFilters(new WsExceptionFilter())
@UsePipes(
  new ValidationPipe({
    transform: true,
    exceptionFactory: (errors) =>
      new WsException(
        errors
          .map((e) => Object.values(e.constraints ?? {}).join(', '))
          .join('; '),
      ),
  }),
)
@WebSocketGateway({ cors: { origin: env.CLIENT_URL } })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly connectionService: ChatConnectionService,
    private readonly messageService: ChatMessageService,
  ) {}

  afterInit() {
    void this.messageService.startSpamBot((socketId, msg) => {
      return this.server.to(socketId).emit('newMessage', msg);
    });
  }

  handleConnection(client: Socket): void {
    this.connectionService.handleConnection(client);
  }

  handleDisconnect(client: Socket): void {
    const payload = this.connectionService.handleDisconnect(client);

    if (payload) {
      this.server.emit('userStatusChanged', payload);
    }
  }

  @SubscribeMessage('getContacts')
  handleGetContacts(@ConnectedSocket() client: Socket): void {
    this.messageService.handleGetContacts(client);
  }

  @SubscribeMessage('getHistory')
  handleGetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: GetHistoryDtoValidated,
  ): void {
    this.messageService.handleGetHistory(client, dto);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDtoValidated,
  ): void {
    const result = this.messageService.processMessage(client, dto);

    if (!result) {
      return;
    }

    client.emit('newMessage', result.message);

    if (result.receiverSocketId) {
      this.server
        .to(result.receiverSocketId)
        .emit('newMessage', result.message);
    }
  }
}
