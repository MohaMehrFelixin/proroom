import { IsString, IsNumber, Min, Max } from 'class-validator';

export class RequestUploadDto {
  @IsString()
  roomId: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  @Max(100 * 1024 * 1024) // 100MB
  size: number;
}
