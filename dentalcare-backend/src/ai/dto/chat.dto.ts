import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID } from 'class-validator'
import { Transform } from 'class-transformer'

export class ChatDto {
  @IsString()
  @IsNotEmpty({ message: 'message cannot be empty' })
  @MaxLength(1000, { message: 'message too long (max 1000 characters)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/<[^>]*>/g, '') : value))
  message: string

  @IsOptional()
  @IsUUID('4', { message: 'sessionId must be a valid UUID v4' })
  sessionId?: string
}
