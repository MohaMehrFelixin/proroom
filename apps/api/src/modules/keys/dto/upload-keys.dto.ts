import { IsString } from 'class-validator';

export class UploadKeysDto {
  @IsString()
  identityKey: string; // base64

  @IsString()
  signedPreKey: string; // base64

  @IsString()
  preKeySignature: string; // base64
}
