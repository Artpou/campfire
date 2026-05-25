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

export class NotFoundError extends HTTPException {
  constructor(resource = "Resource") {
    super(404, { message: `${resource} not found` });
  }
}

export class BadRequestError extends HTTPException {
  constructor(message = "Bad request") {
    super(400, { message });
  }
}

export class ConflictError extends HTTPException {
  constructor(message = "Conflict") {
    super(409, { message });
  }
}

export class ServiceUnavailableError extends HTTPException {
  constructor(service = "Service") {
    super(503, { message: `${service} is currently unavailable` });
  }
}
