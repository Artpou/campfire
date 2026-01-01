import { Elysia, t } from "elysia";

import { hashPassword } from "@/auth/password.util";
import { NewUser } from "@/db/schema";
import { authGuard } from "@/modules/auth/auth.guard";
import { ForbiddenError, requireRole } from "@/modules/auth/role.guard";
import { UserService } from "./user.service";

const createUserSchema = t.Object({
  username: t.String({ minLength: 3 }),
  password: t.String({ minLength: 8 }),
  role: t.Union([t.Literal("owner"), t.Literal("admin"), t.Literal("member"), t.Literal("viewer")]),
});

const updateUserSchema = t.Object({
  username: t.Optional(t.String({ minLength: 3 })),
  password: t.Optional(t.String({ minLength: 8 })),
  role: t.Optional(
    t.Union([t.Literal("owner"), t.Literal("admin"), t.Literal("member"), t.Literal("viewer")]),
  ),
});

export const userRoutes = new Elysia({ prefix: "/user" })
  .use(authGuard())
  // Get single user (authenticated users only)
  .get(
    "/:id",
    async ({ params }) => {
      const userService = new UserService();
      const user = await userService.getById(params.id);
      if (!user) throw new Error("User not found");
      return user;
    },
    { params: t.Object({ id: t.String() }) },
  )
  // List all users (admin+ only)
  .use(requireRole("admin"))
  .get("/", async () => {
    const userService = new UserService();
    return await userService.list();
  })
  // Create user (admin+, with role restrictions)
  .post(
    "/",
    async ({ user, body }) => {
      const userService = new UserService();

      // Check role restrictions
      if (user.role === "admin" && (body.role === "owner" || body.role === "admin")) {
        throw new ForbiddenError("Admin can only create member or viewer roles");
      }

      // Check if username already exists
      const existingUser = await userService.getByUsername(body.username);
      if (existingUser) throw new Error("Username already exists");

      // Create user with hashed password
      const newUser = await userService.create({
        username: body.username,
        password: hashPassword(body.password),
        role: body.role,
      });

      return newUser;
    },
    { body: createUserSchema },
  )
  // Update user (admin+, with restrictions)
  .put(
    "/:id",
    async ({ user, params, body }) => {
      const userService = new UserService();

      const targetUser = await userService.getById(params.id);
      if (!targetUser) throw new Error("User not found");

      // Owner cannot be modified
      if (targetUser.role === "owner") {
        throw new ForbiddenError("Cannot modify owner account");
      }

      // Admin cannot modify other admins or create owner/admin
      if (user.role === "admin") {
        if (targetUser.role === "admin") {
          throw new ForbiddenError("Admin cannot modify other admin accounts");
        }
        if (body.role && (body.role === "owner" || body.role === "admin")) {
          throw new ForbiddenError("Admin can only set member or viewer roles");
        }
      }

      // Prepare update data
      const updateData: Partial<NewUser> = {};
      if (body.username) updateData.username = body.username;
      if (body.password) updateData.password = hashPassword(body.password);
      if (body.role) updateData.role = body.role;

      const updatedUser = await userService.update(params.id, updateData);
      return updatedUser;
    },
    {
      params: t.Object({ id: t.String() }),
      body: updateUserSchema,
    },
  )
  // Delete user (admin+, cannot delete owner)
  .delete(
    "/:id",
    async ({ user, params }) => {
      const userService = new UserService();

      const targetUser = await userService.getById(params.id);
      if (!targetUser) throw new Error("User not found");

      // Owner cannot be deleted
      if (targetUser.role === "owner") {
        throw new ForbiddenError("Cannot delete owner account");
      }

      // Admin cannot delete other admins
      if (user.role === "admin" && targetUser.role === "admin") {
        throw new ForbiddenError("Admin cannot delete other admin accounts");
      }

      await userService.delete(params.id);
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) },
  );
