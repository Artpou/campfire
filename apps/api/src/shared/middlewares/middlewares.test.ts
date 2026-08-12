import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";

import { errorHandler } from "./error.middleware";
import { requestLogger } from "./logger.middleware";
import { requestTimeout } from "./timeout.middleware";

describe("errorHandler", () => {
  it("returns HTTPException response body", async () => {
    const app = new Hono().onError(errorHandler).get("/not-found", () => {
      throw new NotFoundError("Item");
    });
    const res = await app.request("/not-found");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
  });

  it("maps unknown errors to 500", async () => {
    const app = new Hono().onError(errorHandler).get("/boom", () => {
      throw new Error("unexpected");
    });
    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Internal Server Error" });
  });

  it("returns 204 for abort errors", async () => {
    const app = new Hono().onError(errorHandler).get("/abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    });
    const res = await app.request("/abort");
    expect(res.status).toBe(204);
  });

  it("returns 401 from HTTPException", async () => {
    const app = new Hono().onError(errorHandler).get("/auth", () => {
      throw new HTTPException(401, { message: "Unauthorized" });
    });
    expect((await app.request("/auth")).status).toBe(401);
  });
});

describe("requestTimeout", () => {
  it("skips timeout for streaming and long-running prefixes", async () => {
    const app = new Hono().use("*", requestTimeout).get("/streaming/:id/direct", (c) => c.text("ok"));
    expect((await app.request("/streaming/dl-1/direct")).status).toBe(200);
  });

  it("applies timeout middleware on regular routes", async () => {
    const app = new Hono().use("*", requestTimeout).get("/fast", (c) => c.json({ ok: true }));
    expect((await app.request("/fast")).status).toBe(200);
  });
});

describe("requestLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("logs successful requests without failing the response", async () => {
    const app = new Hono().use("*", requestLogger).get("/ping", (c) => c.json({ pong: true }));
    const res = await app.request("/ping");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ pong: true });
  });

  it("attempts to log validation issues on 400", async () => {
    const app = new Hono()
      .use("*", requestLogger)
      .get("/bad", (c) => c.json({ error: { issues: [{ path: ["x"], message: "required" }] } }, 400));

    const res = await app.request("/bad");
    expect(res.status).toBe(400);
  });
});

describe("BadRequestError shape", () => {
  it("is an HTTPException", () => {
    const err = new BadRequestError("nope");
    expect(err).toBeInstanceOf(HTTPException);
    expect(err.status).toBe(400);
  });
});
