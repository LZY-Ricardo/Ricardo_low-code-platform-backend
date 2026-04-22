import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '表单名称长度不能超过100个字符' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '表单描述长度不能超过500个字符' })
  description?: string;

  @IsOptional()
  @IsArray()
  fields?: any[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
