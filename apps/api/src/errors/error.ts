import { HTTPException } from "hono/http-exception";

export class UnauthorizedError extends HTTPException {
  constructor(message = "Unauthorized") {
    super(401, { message });
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message = "Forbidden") {
    super(403, { message });
  }
}
