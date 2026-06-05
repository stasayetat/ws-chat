export type UserStatus = 'online' | 'offline';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: UserStatus;
}

export interface Contact extends User {
  lastMessage?: string;
  lastMessageAt?: number;
  unreadCount?: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export interface ConnectDto {
  name: string;
  avatar: string;
}

export interface SendMessageDto {
  receiverId: string;
  text: string;
}

export interface GetHistoryDto {
  contactId: string;
}

export interface UserStatusChangedDto {
  id: string;
  status: UserStatus;
}
