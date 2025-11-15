import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
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
    const user = await this.usersService.findByUsername(loginDto.username);

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
}
