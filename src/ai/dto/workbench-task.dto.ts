import { IsArray, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class WorkbenchTaskDto {
  @IsIn([
    'generate-page',
    'edit-selection',
    'bind-data',
    'generate-action',
  ])
  taskType!: 'generate-page' | 'edit-selection' | 'bind-data' | 'generate-action';

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsArray()
  components?: unknown[];

  @IsOptional()
  @IsArray()
  dataSources?: unknown[];

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
  selectionSummary?: string;

  @IsOptional()
  @IsString()
  conversationSummary?: string;
}
