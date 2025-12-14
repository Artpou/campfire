import { Elysia, t } from "elysia";
import { auth } from "@/auth";
import { userService } from "@/services/user.service";

// Helper to get user from session
const getUser = async (request: Request) => {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user;
};

export const userRoutes = new Elysia({ prefix: "/user" })
  .get(
    "/:id",
    async ({ params: { id }, set }) => {
      const user = await userService.getById(id);
      if (!user) {
        set.status = 404;
        return "User not found";
      }
      return user;
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .get(
    "/email/:email",
    async ({ params: { email }, set }) => {
      const user = await userService.getByEmail(email);
      if (!user) {
        set.status = 404;
        return "User not found";
      }
      return user;
    },
    {
      params: t.Object({ email: t.String({ format: "email" }) }),
    },
  )
  .get("/", () => userService.getAll())
  .patch(
    "/:id",
    async ({ params: { id }, body, request, set }) => {
      const user = await getUser(request);
      if (!user || user.id !== id) {
        set.status = 403;
        return "You can only update your own profile";
      }
      const updatedUser = await userService.update(id, body);
      if (!updatedUser) {
        set.status = 404;
        return "User not found";
      }
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
    async ({ params: { id }, request, set }) => {
      const user = await getUser(request);
      if (!user || user.id !== id) {
        set.status = 403;
        return "You can only delete your own account";
      }
      await userService.delete(id);
      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
