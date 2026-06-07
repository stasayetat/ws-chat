import { SendMessageDto } from '@chat/api-interfaces';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDtoValidated implements SendMessageDto {
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}
