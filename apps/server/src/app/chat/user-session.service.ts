import { Injectable } from '@nestjs/common';

@Injectable()
export class UserSessionService {
  private readonly socketToUser = new Map<string, string>();
  private readonly userToSocket = new Map<string, string>();

  register(socketId: string, userId: string): void {
    this.socketToUser.set(socketId, userId);
    this.userToSocket.set(userId, socketId);
  }

  unregister(socketId: string): string | undefined {
    const userId = this.socketToUser.get(socketId);

    if (!userId) {
      return undefined;
    }

    this.socketToUser.delete(socketId);
    this.userToSocket.delete(userId);

    return userId;
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  getSocketId(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  getAllUserIds(): string[] {
    return [...this.userToSocket.keys()];
  }
}
