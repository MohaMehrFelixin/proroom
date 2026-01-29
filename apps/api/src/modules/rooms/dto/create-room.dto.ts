import { IsString, IsEnum, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEnum(['DM', 'GROUP'])
  type: 'DM' | 'GROUP';

  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}
