import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class EditSelectionDto {
  @IsString()
  prompt!: string;

  @IsInt()
  selectedComponentId!: number;

  @IsArray()
  components!: unknown[];

  @IsOptional()
  @IsString()
  currentThemeId?: string;

  @IsOptional()
  @IsString()
  currentProjectId?: string;

  @IsOptional()
  @IsString()
  selectionSummary?: string;

  @IsOptional()
  @IsString()
  conversationSummary?: string;
}
