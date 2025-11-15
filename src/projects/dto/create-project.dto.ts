import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: '项目名称不能为空' })
  @MaxLength(50, { message: '项目名称长度不能超过50个字符' })
  name: string;

  @IsOptional()
  @IsArray()
  components?: any[];
}
