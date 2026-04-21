import { IsArray, IsOptional, IsString } from 'class-validator';

export class GeneratePageDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsArray()
  components?: unknown[];

  @IsOptional()
  @IsString()
  currentThemeId?: string;

  @IsOptional()
  @IsString()
  currentProjectId?: string;
}
