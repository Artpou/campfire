import type { User } from "@/modules/user/user.schema";
import { user } from "@/modules/user/user.schema";
import type { TestDb } from "./test.helper";

export function seedTestUser(db: TestDb, fakeUser: Pick<User, "id" | "username" | "role" | "createdAt">): void {
  db.insert(user)
    .values({
      id: fakeUser.id,
      username: fakeUser.username,
      password: "x",
      role: fakeUser.role,
      createdAt: fakeUser.createdAt,
    })
    .run();
}

export function createAuthGuardMock(fakeUser: Pick<User, "id" | "username" | "role" | "createdAt">) {
  return async (c: unknown, next: () => Promise<void>) => {
    (c as { set: (k: string, v: unknown) => void }).set("user", fakeUser);
    await next();
  };
}
