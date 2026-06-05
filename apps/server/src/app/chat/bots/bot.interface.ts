import { Message } from '@chat/api-interfaces';

export type EmitNewMessage = (event: 'newMessage', data: Message) => void;

export interface Bot {
  readonly id: string;
  readonly name: string;
  handleMessage(message: Message, emit: EmitNewMessage): void;
}
