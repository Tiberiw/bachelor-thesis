import { IsEmail, IsNotEmpty } from 'class-validator';

export class MagicLinkRequestDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}