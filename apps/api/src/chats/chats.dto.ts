import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const MAX_CHAT_MESSAGE_LENGTH = 2000;

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_CHAT_MESSAGE_LENGTH)
  text!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/)
  clientMessageId?: string;
}
