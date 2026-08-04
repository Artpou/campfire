import { Hono } from "hono";

import { NotFoundError } from "@/errors/error";
import type { Paginate, PaginationQuery } from "@/helpers/pagination.dto";
import { toPaginate } from "@/helpers/pagination.helper";
import { authGuard, type HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import type { User } from "../../modules/user/user.dto";

export class AuthenticatedService {
  protected readonly user: User;

  get roleLevel(): number {
    return ROLE_LEVELS[this.user.role];
  }

  constructor(user: User) {
    this.user = user;
  }

  static createRouter<S extends AuthenticatedService>(this: new (user: User) => S) {
    return new Hono<{ Variables: HonoAuthenticatedVariables & { service: S } }>()
      .use(authGuard)
      .use("*", async (c, next) => {
        const user = c.get("user");
        c.set("service", new this(user));
        await next();
      });
  }
}

export interface Identifiable {
  id: number | string;
}
export abstract class IdentifiableService<T extends Identifiable> extends AuthenticatedService {
  abstract getMany({ ids }: { ids?: string[] }): Promise<T[]>;

  async get(id: string): Promise<T> {
    const result = (await this.getMany({ ids: [id] }))?.[0];
    if (!result) {
      throw new NotFoundError("Item not found");
    }
    return result;
  }

  async list(query: PaginationQuery): Promise<Paginate<T>> {
    return toPaginate(await this.getMany(query), query);
  }
}
