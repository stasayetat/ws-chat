import { Test } from '@nestjs/testing';

import { UserSessionService } from './user-session.service';

describe('UserSessionService', () => {
  let service: UserSessionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserSessionService],
    }).compile();

    service = module.get(UserSessionService);
  });

  it('registers a session and resolves both directions', () => {
    service.register('socket-1', 'user-1');
    expect(service.getUserId('socket-1')).toBe('user-1');
    expect(service.getSocketId('user-1')).toBe('socket-1');
  });

  it('unregisters a session and returns the userId', () => {
    service.register('socket-1', 'user-1');
    const userId = service.unregister('socket-1');
    expect(userId).toBe('user-1');
    expect(service.getUserId('socket-1')).toBeUndefined();
    expect(service.getSocketId('user-1')).toBeUndefined();
  });

  it('returns undefined when unregistering an unknown socket', () => {
    expect(service.unregister('unknown-socket')).toBeUndefined();
  });

  it('returns all registered user ids', () => {
    service.register('socket-1', 'user-1');
    service.register('socket-2', 'user-2');
    expect(service.getAllUserIds()).toEqual(
      expect.arrayContaining(['user-1', 'user-2']),
    );
    expect(service.getAllUserIds()).toHaveLength(2);
  });


});
