import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShareDto {
  @IsIn(['view', 'edit'])
  permission: 'view' | 'edit';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresIn?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  password?: string;
}
