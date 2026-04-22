import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(4, { message: '用户名至少需要4个字符' })
  @MaxLength(20, { message: '用户名最多20个字符' })
  username?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
