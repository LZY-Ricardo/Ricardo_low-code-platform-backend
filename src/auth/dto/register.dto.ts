import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(4, { message: '用户名至少需要4个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少需要8位字符' })
  password: string;
}
