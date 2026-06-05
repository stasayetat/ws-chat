import { Contact, Message, User, UserStatus } from '@chat/api-interfaces';
import { Inject, Injectable } from '@nestjs/common';

import { MESSAGE_REPOSITORY, USER_REPOSITORY } from './chat.tokens';
import { IMessageRepository } from './repositories/message-repository.interface';
import { IUserRepository } from './repositories/user-repository.interface';

@Injectable()
export class ChatService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(MESSAGE_REPOSITORY) private readonly messages: IMessageRepository,
  ) {}

  addUser(user: User): void {
    this.users.save(user);
  }

  setUserStatus(id: string, status: UserStatus): void {
    this.users.updateStatus(id, status);
  }

  getUser(id: string): User | undefined {
    return this.users.findById(id);
  }

  getContacts(excludeId: string): Contact[] {
    return this.users.findAll().filter((user) => user.id !== excludeId);
  }

  addMessage(message: Message): void {
    this.messages.save(message);
  }

  getHistory(userId1: string, userId2: string): Message[] {
    return this.messages.findByConversation(userId1, userId2);
  }
}
