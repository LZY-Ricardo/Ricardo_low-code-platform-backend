import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSharedProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '项目名称长度不能超过50个字符' })
  name?: string;

  @IsOptional()
  @IsArray()
  components?: any[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;
}
