import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty({ message: '模板名称不能为空' })
  @MaxLength(100, { message: '模板名称长度不能超过100个字符' })
  name: string;

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

  @IsArray()
  components: any[];

  @IsArray()
  @IsOptional()
  pages?: any[];

  @IsOptional()
  dataSources?: any;

  @IsOptional()
  variables?: any;

  @IsArray()
  @IsOptional()
  sharedStyles?: any[];

  @IsString()
  @IsOptional()
  themeId?: string;

  @IsBoolean()
  @IsOptional()
  builtIn?: boolean;
}
