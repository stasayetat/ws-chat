import { Injectable } from '@angular/core';
import {
  Contact,
  GetHistoryDto,
  Message,
  SendMessageDto,
  User,
  UserStatusChangedDto,
} from '@chat/api-interfaces';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

import { environment } from '../../../environments/environment';
import {
  getOrCreateUser,
  SESSION_ID_KEY,
  StoredUser,
} from '../../helpers/socket.utils';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private readonly socket: Socket;
  readonly currentUser: StoredUser;

  constructor() {
    this.currentUser = getOrCreateUser();
    this.socket = io(environment.serverUrl, {
      auth: {
        userId: sessionStorage.getItem(SESSION_ID_KEY) ?? undefined,
        name: this.currentUser.name,
        avatar: this.currentUser.avatar,
      },
    });

    this.socket.on('me', (user: User) => {
      sessionStorage.setItem(SESSION_ID_KEY, user.id);
    });

    this.socket.on('connect', () => {
      this.socket.emit('getContacts');
    });
  }

  contactsList$(): Observable<Contact[]> {
    return new Observable<Contact[]>((observer) => {
      const handler = (contacts: Contact[]) => observer.next(contacts);
      this.socket.on('contactsList', handler);

      return () => this.socket.off('contactsList', handler);
    });
  }

  userConnected$(): Observable<User> {
    return new Observable<User>((observer) => {
      const handler = (user: User) => observer.next(user);
      this.socket.on('userConnected', handler);

      return () => this.socket.off('userConnected', handler);
    });
  }

  me$(): Observable<User> {
    return new Observable<User>((observer) => {
      const handler = (user: User) => observer.next(user);
      this.socket.on('me', handler);

      return () => this.socket.off('me', handler);
    });
  }

  userStatusChanged$(): Observable<UserStatusChangedDto> {
    return new Observable<UserStatusChangedDto>((observer) => {
      const handler = (dto: UserStatusChangedDto) => observer.next(dto);
      this.socket.on('userStatusChanged', handler);

      return () => this.socket.off('userStatusChanged', handler);
    });
  }

  newMessage$(): Observable<Message> {
    return new Observable<Message>((observer) => {
      const handler = (message: Message) => observer.next(message);
      this.socket.on('newMessage', handler);

      return () => this.socket.off('newMessage', handler);
    });
  }

  history$(): Observable<{ contactId: string; messages: Message[] }> {
    return new Observable<{ contactId: string; messages: Message[] }>(
      (observer) => {
        const handler = (data: { contactId: string; messages: Message[] }) =>
          observer.next(data);
        this.socket.on('history', handler);

        return () => this.socket.off('history', handler);
      },
    );
  }

  sendMessage(dto: SendMessageDto): void {
    this.socket.emit('sendMessage', dto);
  }

  getHistory(dto: GetHistoryDto): void {
    this.socket.emit('getHistory', dto);
  }
}
