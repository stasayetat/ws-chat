import { Injectable } from '@angular/core';

export const STORAGE_KEY = 'chat_user';
export const SESSION_ID_KEY = 'chat_session_user_id';

export interface StoredUser {
  name: string;
  avatar?: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  readonly currentUser: StoredUser;

  constructor() {
    this.currentUser = this.getOrCreateUser();
  }

  saveSessionId(userId: string) {
    sessionStorage.setItem(SESSION_ID_KEY, userId);
  }

  private getOrCreateUser = (): StoredUser => {
    const storedUser = sessionStorage.getItem(STORAGE_KEY);

    if (storedUser) {
      return JSON.parse(storedUser) as StoredUser;
    }

    const user: StoredUser = {
      name: `User-${this.generateUserId()}`,
      userId: sessionStorage.getItem(SESSION_ID_KEY) ?? undefined,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    return user;
  };

  private generateUserId = () => {
    return Math.floor(Math.random() * 9000 + 1000);
  };
}
