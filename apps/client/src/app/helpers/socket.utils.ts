export const STORAGE_KEY = 'chat_user';
export const SESSION_ID_KEY = 'chat_session_user_id';

export interface StoredUser {
  name: string;
  avatar?: string;
}

export function getOrCreateUser(): StoredUser {
  const stored = sessionStorage.getItem(STORAGE_KEY);

  if (stored) {
    return JSON.parse(stored) as StoredUser;
  }

  const user: StoredUser = {
    name: `User${Math.floor(Math.random() * 9000 + 1000)}`,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));

  return user;
}
