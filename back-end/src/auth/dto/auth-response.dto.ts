export class AuthResponseDto {
  accessToken: string;
  userId: string;
  isNewUser: boolean;

  constructor(accessToken: string, userId: string, isNewUser: boolean) {
    this.accessToken = accessToken;
    this.userId = userId;
    this.isNewUser = isNewUser;
  }
}