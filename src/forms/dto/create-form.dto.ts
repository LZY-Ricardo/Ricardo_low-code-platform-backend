import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty({ message: '表单名称不能为空' })
  @MaxLength(100, { message: '表单名称长度不能超过100个字符' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '表单描述长度不能超过500个字符' })
  description?: string;

  @IsArray()
  fields: any[];

  @IsString()
  @IsNotEmpty({ message: '项目ID不能为空' })
  projectId: string;

  @IsOptional()
  @IsString()
  pageId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
