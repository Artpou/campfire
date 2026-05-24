import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { hashPassword } from "@/auth/password.util";
import { ForbiddenError } from "@/errors/error";
import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import type { HonoVariables } from "@/types/hono";
import { createUserSchema, type NewUser, updateUserSchema } from "./user.dto";
import { UserService } from "./user.service";

export const userRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  // Get single user (authenticated users only)
  .get("/:id", async (c) => {
    const userService = new UserService();
    const user = await userService.getById(c.req.param("id"));
    if (!user) throw new Error("User not found");
    return c.json(user);
  })
  // List all users (admin+ only)
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    const userService = new UserService();
    return c.json(await userService.list());
  })
  // Create user (admin+, with role restrictions)
  .post("/", zValidator("json", createUserSchema), async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
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

    return c.json(newUser);
  })
  // Update user (admin+, with restrictions)
  .put("/:id", zValidator("json", updateUserSchema), async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");
    const userService = new UserService();

    const targetUser = await userService.getById(c.req.param("id"));
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

    const updatedUser = await userService.update(c.req.param("id"), updateData);
    return c.json(updatedUser);
  })
  // Delete user (admin+, cannot delete owner)
  .delete("/:id", async (c) => {
    const user = c.get("user");
    const userService = new UserService();

    const targetUser = await userService.getById(c.req.param("id"));
    if (!targetUser) throw new Error("User not found");

    // Owner cannot be deleted
    if (targetUser.role === "owner") {
      throw new ForbiddenError("Cannot delete owner account");
    }

    // Admin cannot delete other admins
    if (user.role === "admin" && targetUser.role === "admin") {
      throw new ForbiddenError("Admin cannot delete other admin accounts");
    }

    await userService.delete(c.req.param("id"));
    return c.json({ success: true });
  });

export type UserRoutesType = typeof userRoutes;
