import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

function errorResponse(status: ContentfulStatusCode, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class UnauthorizedError extends HTTPException {
  constructor(message = "Unauthorized") {
    super(401, { message, res: errorResponse(401, message) });
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message = "Forbidden") {
    super(403, { message, res: errorResponse(403, message) });
  }
}

export class NotFoundError extends HTTPException {
  constructor(resource = "Resource") {
    const error = `${resource} not found`;
    super(404, { message: error, res: errorResponse(404, error) });
  }
}

export class BadRequestError extends HTTPException {
  constructor(message = "Bad request") {
    super(400, { message, res: errorResponse(400, message) });
  }
}

export class ConflictError extends HTTPException {
  constructor(message = "Conflict") {
    super(409, { message, res: errorResponse(409, message) });
  }
}

export class ServiceUnavailableError extends HTTPException {
  constructor(service = "Service") {
    const error = `${service} is currently unavailable`;
    super(503, { message: error, res: errorResponse(503, error) });
  }
}
