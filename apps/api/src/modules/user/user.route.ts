import { Elysia, status, t } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { userService } from "./user.service";

export const userRoutes = new Elysia({ prefix: "/user" })
  .get("/", () => userService.getAll())
  .get(
    "/:id",
    async ({ params }) => {
      const user = await userService.getById(params.id);
      if (!user) return status(404, "User not found");
      return user;
    },
    { params: t.Object({ id: t.String() }) },
  )
  .get(
    "/email/:email",
    async ({ params }) => {
      const user = await userService.getByEmail(params.email);
      if (!user) return status(404, "User not found");
      return user;
    },
    { params: t.Object({ email: t.String({ format: "email" }) }) },
  )
  .use(authGuard())
  .patch(
    "/:id",
    async ({ params, body, user }) => {
      if (user.id !== params.id) return status(403, "You can only update your own profile");
      const updatedUser = await userService.update(params.id, body);
      if (!updatedUser) return status(404, "User not found");
      return updatedUser;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          email: t.String({ format: "email" }),
          name: t.String(),
          image: t.String(),
        }),
      ),
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      if (user.id !== params.id) return status(403, "You can only delete your own account");
      await userService.delete(params.id);
    },
    { params: t.Object({ id: t.String() }) },
  );
