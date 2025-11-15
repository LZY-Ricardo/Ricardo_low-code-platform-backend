import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '项目名称长度不能超过50个字符' })
  name?: string;

  @IsOptional()
  @IsArray()
  components?: any[];
}
