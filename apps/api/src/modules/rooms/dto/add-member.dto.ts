import { IsString, IsOptional, IsEnum } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'MEMBER'])
  role?: 'ADMIN' | 'MEMBER';
}
