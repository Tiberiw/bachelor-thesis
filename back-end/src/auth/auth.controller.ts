import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { MagicLinkRequestDto } from "./dto/magic-link-request.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("magic-link")
  async requestMagicLink(@Body() { email }: MagicLinkRequestDto) {
    const sent = await this.authService.createAndSendMagicLink(email);
    if (!sent) {
      throw new BadRequestException("Failed to send magic link email");
    }
    return { message: "Magic link has been sent to your email" };
  }

  @Post("verify")
  async verifyMagicLink(@Body() { token }: VerifyTokenDto) {
    return await this.authService.verifyMagicLink(token);
  }
}
