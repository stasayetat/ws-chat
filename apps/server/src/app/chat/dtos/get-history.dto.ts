import { GetHistoryDto } from '@chat/api-interfaces';
import { IsString } from 'class-validator';

export class GetHistoryDtoValidated implements GetHistoryDto {
  @IsString()
  contactId: string;
}
