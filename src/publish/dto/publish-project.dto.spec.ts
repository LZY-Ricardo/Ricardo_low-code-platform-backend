import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublishProjectDto } from './publish-project.dto';

describe('PublishProjectDto', () => {
  it('accepts chinese slug', async () => {
    const dto = plainToInstance(PublishProjectDto, {
      slug: '系统设置',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported slug characters', async () => {
    const dto = plainToInstance(PublishProjectDto, {
      slug: 'system settings!',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
