import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MagicLink } from './entities/magic-link.entity';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Payload } from './interfaces/payload';
import { AuthResponseDto } from './dto/auth-response.dto';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@InjectRepository(MagicLink) private readonly magicLinkRepository: Repository<MagicLink>,
              private readonly userService: UserService,
              private readonly mailService: MailService,
              private readonly jwtService: JwtService,
              private readonly configService: ConfigService) {}

  async createAndSendMagicLink(email: string): Promise<boolean> {
    //Generate unique token
    const token = uuidv4()

    //Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiration

    //Find user if exists
    const user = await this.userService.findByEmail(email) ?? undefined;

    //Create magic link
    const magicLink = this.magicLinkRepository.create({
      token,
      expiresAt,
      email,
      user,
    });

    await this.magicLinkRepository.save(magicLink);
    return this.mailService.sendMagicLink(email, token);
  }

  async verifyMagicLink(token: string): Promise<AuthResponseDto> {
    // Find magic link by token
    const magicLink = await this.magicLinkRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    // Check if magic link exists and is valid
    if (!magicLink) {
      throw new UnauthorizedException('Invalid magic link');
    }

    // Check if magic link is expired
    if (magicLink.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link has expired');
    }

    // Check if magic link is already used
    if (magicLink.used) {
      throw new UnauthorizedException('Magic link has already been used');
    }

    // Find or create user
    let user = magicLink.user;
    let isNewUser = false;

    if (!user) {
      user = await this.userService.createUser(magicLink.email);
      isNewUser = true;
    }

    // Mark magic link as used
    magicLink.used = true;
    await this.magicLinkRepository.save(magicLink);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Generate JWT token
    const payload: Payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);

    return { userId: user.id, accessToken, isNewUser: isNewUser || !user.profileCompleted };
  }

}
