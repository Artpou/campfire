import { User } from "../db/schema";

export abstract class AuthenticatedService {
  protected readonly user: User;
  constructor(user: User) {
    this.user = user;
  }
}
