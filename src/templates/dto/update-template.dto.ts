import {
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '模板名称长度不能超过100个字符' })
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: '模板描述长度不能超过500个字符' })
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  thumbnail?: string;
}
