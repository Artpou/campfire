import { Elysia, status, t } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { userService } from "./user.service";

export const userRoutes = new Elysia({ prefix: "/user" }).use(authGuard()).get(
  "/:id",
  async ({ params }) => {
    const user = await userService.getById(params.id);
    if (!user) return status(404, "User not found");
    return user;
  },
  { params: t.Object({ id: t.String() }) },
);
