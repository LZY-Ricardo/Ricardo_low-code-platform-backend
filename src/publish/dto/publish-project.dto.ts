import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class PublishProjectDto {
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9-\u4e00-\u9fa5]+$/, {
    message: 'slug 只能包含中文、小写字母、数字和连字符',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
