import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signToken } from "@/shared/helpers/crypto.helper";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { getDownloadableFile } = vi.hoisted(() => ({
  getDownloadableFile: vi.fn(),
}));

vi.mock("./local-file.helper", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./local-file.helper")>();
  return {
    ...actual,
    getDownloadableFile,
  };
});

const { localFileRoutes } = await import("./local-file.route");

describe("Local File Routes", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `seedarr-local-file-${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, Buffer.from("hello-file"));
    getDownloadableFile.mockReset();
  });

  afterEach(() => {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignore
    }
  });

  it("returns 401 without token", async () => {
    const res = await localFileRoutes.request("/dl-1");
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid token", async () => {
    const res = await localFileRoutes.request("/dl-1?token=not-a-valid-token");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token downloadId mismatches path id", async () => {
    const token = signToken({ downloadId: "other", userId: "user-1" }, 60);
    const res = await localFileRoutes.request(`/dl-1?token=${encodeURIComponent(token)}`);
    expect(res.status).toBe(401);
  });

  it("streams a local file for a valid token", async () => {
    getDownloadableFile.mockResolvedValue({
      fileName: "movie.bin",
      size: 10,
      filePath: tmpFile,
    });

    const token = signToken({ downloadId: "dl-1", userId: "user-1" }, 60);
    const res = await localFileRoutes.request(`/dl-1?token=${encodeURIComponent(token)}`);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    expect(res.headers.get("Content-Length")).toBe("10");
    expect(res.headers.get("Content-Disposition")).toContain("movie.bin");
    expect(await res.text()).toBe("hello-file");
    expect(getDownloadableFile).toHaveBeenCalledWith("dl-1");
  });

  it("returns 404 when no downloadable file exists", async () => {
    const { NotFoundError } = await import("@/shared/errors/error");
    getDownloadableFile.mockRejectedValue(new NotFoundError("Downloadable file"));

    const token = signToken({ downloadId: "dl-1", userId: "user-1" }, 60);
    const res = await localFileRoutes.request(`/dl-1?token=${encodeURIComponent(token)}`);
    expect(res.status).toBe(404);
  });
});
