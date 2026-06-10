import { Hono } from "hono";

import { Paginate, PaginationQuery } from "@/shared/pagination.dto";
import { toPaginate } from "@/shared/pagination.helper";

import { authGuard, HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import type { User } from "../user/user.dto";

const PRIVILEGED_ROLES = new Set(["owner", "admin"]);

export class AuthenticatedService {
  protected readonly user: User;

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

  protected get isPrivileged(): boolean {
    return PRIVILEGED_ROLES.has(this.user.role);
  }
}

export interface Identifiable {
  id: number | string;
}
export abstract class IdentifiableService<T extends Identifiable> extends AuthenticatedService {
  abstract getMany({ ids }: { ids?: string[] }): Promise<T[]>;

  async get(id: string): Promise<T | undefined> {
    return (await this.getMany({ ids: [id] }))?.[0];
  }

  async list(query: PaginationQuery): Promise<Paginate<T>> {
    return toPaginate(await this.getMany(query), query);
  }
}
