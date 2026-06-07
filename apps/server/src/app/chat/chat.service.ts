import { Contact, Message, User, UserStatus } from '@chat/api-interfaces';
import { Inject, Injectable } from '@nestjs/common';

import { MESSAGE_REPOSITORY, USER_REPOSITORY } from './chat.tokens';
import { IMessageRepository } from './message/message-repository.interface';
import { IUserRepository } from './user/user-repository.interface';

@Injectable()
export class ChatService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(MESSAGE_REPOSITORY)
    private readonly messageRepository: IMessageRepository,
  ) {}

  addUser(user: User): void {
    this.userRepository.save(user);
  }

  setUserStatus(id: string, status: UserStatus): void {
    this.userRepository.updateStatus(id, status);
  }

  getUser(id: string): User | undefined {
    return this.userRepository.findById(id);
  }

  getContacts(excludeId: string): Contact[] {
    return this.userRepository
      .findAll()
      .filter((user) => user.id !== excludeId)
      .map((user) => this.mapLastMessageToContact(excludeId, user));
  }

  addMessage(message: Message): void {
    this.messageRepository.save(message);
  }

  getHistory(userId1: string, userId2: string): Message[] {
    return this.messageRepository.findByConversation(userId1, userId2);
  }

  private mapLastMessageToContact = (excludeId: string, user: User) => {
    const lastMessage = this.messageRepository.findLastByConversation(
      excludeId,
      user.id,
    );

    return {
      ...user,
      lastMessage: lastMessage?.text,
      lastMessageAt: lastMessage?.timestamp,
    };
  };
}
