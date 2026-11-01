import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @HttpCode(200)
  async googleLogin(@Body() { credential }: GoogleLoginDto) {
    return this.authService.loginWithGoogle(credential);
  }
}
