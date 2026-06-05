import { User, UserStatus } from '@chat/api-interfaces';
import { Injectable } from '@nestjs/common';

import { IUserRepository } from './user-repository.interface';

@Injectable()
export class MemoryUserRepository implements IUserRepository {
  private readonly store = new Map<string, User>();

  save(user: User): void {
    this.store.set(user.id, user);
  }

  delete(id: string): void {
    this.store.delete(id);
  }

  updateStatus(id: string, status: UserStatus): void {
    const user = this.store.get(id);

    if (user) {
      this.store.set(id, { ...user, status });
    }
  }

  findById(id: string): User | undefined {
    return this.store.get(id);
  }

  findAll(): User[] {
    return [...this.store.values()];
  }
}
