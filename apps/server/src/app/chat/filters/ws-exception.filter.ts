import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost): void {
    const client: Socket = host.switchToWs().getClient();

    const message = exception.getError();

    client.emit('error', { message });
  }
}
