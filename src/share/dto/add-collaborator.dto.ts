import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AddCollaboratorDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsIn(['editor', 'viewer'])
  role: 'editor' | 'viewer';
}
