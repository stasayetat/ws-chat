import { Message } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';

import { IMessageRepository } from './message-repository.interface';

@Injectable()
export class MemoryMessageRepository implements IMessageRepository {
  private readonly store = new Map<string, Message[]>();

  save(message: Message): void {
    const conversationKey = this.generateConversationKey(
      message.senderId,
      message.receiverId,
    );

    const history = this.store.get(conversationKey) ?? [];
    this.store.set(conversationKey, [...history, message]);
  }

  findByConversation(userId1: string, userId2: string): Message[] {
    const conversationKey = this.generateConversationKey(userId1, userId2);

    return this.store.get(conversationKey) ?? [];
  }

  findLastByConversation(userId1: string, userId2: string): Message | undefined {
    const messages = this.findByConversation(userId1, userId2);

    return messages[messages.length - 1];
  }

  private generateConversationKey(a: string, b: string): string {
    return [a, b].sort().join(':');
  }
}
