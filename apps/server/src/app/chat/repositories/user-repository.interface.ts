import { User, UserStatus } from '@chat/api-interfaces';

export interface IUserRepository {
  save(user: User): void;
  delete(id: string): void;
  updateStatus(id: string, status: UserStatus): void;
  findById(id: string): User | undefined;
  findAll(): User[];
}
