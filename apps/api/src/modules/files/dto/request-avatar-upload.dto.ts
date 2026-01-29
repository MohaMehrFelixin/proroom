import { IsString, IsNumber, Min, Max } from 'class-validator';

export class RequestAvatarUploadDto {
  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(5 * 1024 * 1024) // 5MB
  size: number;
}
