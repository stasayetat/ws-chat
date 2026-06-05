import { Message } from '@chat/api-interfaces';

export interface IMessageRepository {
  save(message: Message): void;
  findByConversation(userId1: string, userId2: string): Message[];
}
