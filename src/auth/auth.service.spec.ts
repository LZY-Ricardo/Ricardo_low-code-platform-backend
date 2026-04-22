import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByUsernameOrEmail: jest.fn(),
    validatePassword: jest.fn(),
    findById: jest.fn(),
    findAuthUserById: jest.fn(),
    updateProfile: jest.fn(),
    hashPassword: jest.fn(),
    updatePassword: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      usersService as any,
      jwtService as any,
      configService as any,
    );
  });

  it('updates profile and returns user payload', async () => {
    usersService.updateProfile.mockResolvedValue({
      id: 'user_1',
      username: 'new_name',
      email: 'test@example.com',
      avatarUrl: '/uploads/avatar.png',
      createdAt: new Date(),
    });

    const result = await service.updateProfile('user_1', {
      username: 'new_name',
      avatarUrl: '/uploads/avatar.png',
    });

    expect(usersService.updateProfile).toHaveBeenCalledWith('user_1', {
      username: 'new_name',
      avatarUrl: '/uploads/avatar.png',
    });
    expect(result.code).toBe(0);
  });

  it('throws when current password is invalid', async () => {
    usersService.findAuthUserById.mockResolvedValue({
      id: 'user_1',
      password: 'hashed',
    });
    usersService.validatePassword.mockResolvedValue(false);

    await expect(
      service.changePassword('user_1', {
        currentPassword: 'wrong',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('hashes and updates password', async () => {
    usersService.findAuthUserById.mockResolvedValue({
      id: 'user_1',
      password: 'hashed',
    });
    usersService.validatePassword.mockResolvedValue(true);
    usersService.hashPassword.mockResolvedValue('new-hash');
    usersService.updatePassword.mockResolvedValue(undefined);

    const result = await service.changePassword('user_1', {
      currentPassword: 'current-password',
      newPassword: 'new-password',
    });

    expect(usersService.hashPassword).toHaveBeenCalledWith('new-password');
    expect(usersService.updatePassword).toHaveBeenCalledWith('user_1', 'new-hash');
    expect(result.code).toBe(0);
  });
});
