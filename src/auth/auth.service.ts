import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(
      registerDto.username,
      registerDto.email,
      registerDto.password,
    );

    return {
      code: 0,
      message: '注册成功',
      data: user,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByUsernameOrEmail(
      loginDto.username,
    );

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      code: 0,
      message: '登录成功',
      data: {
        accessToken,
        expiresIn: 604800,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        },
      },
    };
  }

  async verify(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      code: 0,
      message: 'Token 有效',
      data: user,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.usersService.updateProfile(userId, {
      username: updateProfileDto.username?.trim(),
      avatarUrl: updateProfileDto.avatarUrl,
    });

    return {
      code: 0,
      message: '资料更新成功',
      data: user,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findAuthUserById(userId);

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const isCurrentPasswordValid = await this.usersService.validatePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('当前密码错误');
    }

    const hashedPassword = await this.usersService.hashPassword(
      changePasswordDto.newPassword,
    );
    await this.usersService.updatePassword(userId, hashedPassword);

    return {
      code: 0,
      message: '密码修改成功',
      data: { success: true },
    };
  }

  /**
   * 刷新 Token
   * 接受已过期的 JWT，在宽限期内签发新 token
   */
  async refreshToken(oldToken: string) {
    try {
      // 解码 token，允许已过期
      const decoded = this.jwtService.verify(oldToken, {
        ignoreExpiration: true,
      });

      // 检查宽限期（token 过期后 7 天内可刷新）
      const now = Math.floor(Date.now() / 1000);
      const expiredAt = decoded.exp;
      const gracePeriod = 7 * 24 * 60 * 60; // 7 天
      if (now - expiredAt > gracePeriod) {
        throw new UnauthorizedException('Token 已超过刷新宽限期，请重新登录');
      }

      // 验证用户仍存在
      const user = await this.usersService.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 签发新 token
      const payload = { userId: user.id, username: user.username };
      const accessToken = this.jwtService.sign(payload);
      const expiresIn = this.configService.get<number>(
        'JWT_EXPIRES_IN',
        604800,
      );

      return {
        code: 0,
        message: 'Token 刷新成功',
        data: {
          accessToken,
          expiresIn,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效的 Token');
    }
  }
}
