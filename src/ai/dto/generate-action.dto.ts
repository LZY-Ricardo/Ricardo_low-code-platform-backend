import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class GenerateActionDto {
  @IsArray()
  components!: unknown[];

  @IsArray()
  dataSources!: unknown[];

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  currentThemeId?: string;

  @IsOptional()
  @IsString()
  currentProjectId?: string;

  @IsOptional()
  @IsInt()
  selectedComponentId?: number;

  @IsOptional()
  @IsString()
  conversationSummary?: string;
}
