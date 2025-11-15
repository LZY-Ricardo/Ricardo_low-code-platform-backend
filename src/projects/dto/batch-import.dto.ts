import { IsArray, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProjectDto } from './create-project.dto';

export class BatchImportDto {
  @IsArray()
  @ArrayMaxSize(100, { message: '批量导入最多支持100个项目' })
  @ValidateNested({ each: true })
  @Type(() => CreateProjectDto)
  projects: CreateProjectDto[];
}
