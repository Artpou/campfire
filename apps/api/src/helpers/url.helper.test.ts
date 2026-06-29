import { describe, expect, it } from "vitest";

import { assertPublicHttpUrl, assertSafeIndexerUrl, isPrivateHost } from "./url.helper";

describe("isPrivateHost", () => {
  it("detects common private hosts", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("127.0.0.2")).toBe(true);
    expect(isPrivateHost("127.1.2.3")).toBe(true);
    expect(isPrivateHost("192.168.1.1")).toBe(true);
    expect(isPrivateHost("10.0.0.5")).toBe(true);
    expect(isPrivateHost("172.16.0.1")).toBe(true);
    expect(isPrivateHost("169.254.169.254")).toBe(true);
    expect(isPrivateHost("169.254.1.1")).toBe(true);
    expect(isPrivateHost("metadata.google.internal")).toBe(true);
    expect(isPrivateHost("host.docker.internal")).toBe(true);
    expect(isPrivateHost("[::1]")).toBe(true);
    expect(isPrivateHost("fe80::1")).toBe(true);
  });

  it("allows public hosts", () => {
    expect(isPrivateHost("example.com")).toBe(false);
    expect(isPrivateHost("tracker.opentrackr.org")).toBe(false);
  });
});

describe("assertPublicHttpUrl", () => {
  it("accepts public http(s) URLs", () => {
    expect(() => assertPublicHttpUrl("https://example.com/file.torrent")).not.toThrow();
  });

  it("rejects private network URLs", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/file.torrent")).toThrow(/private networks/);
    expect(() => assertPublicHttpUrl("http://192.168.0.1/file.torrent")).toThrow(/private networks/);
  });

  it("rejects non-http schemes", () => {
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(/Invalid torrent URI scheme/);
  });
});

describe("assertSafeIndexerUrl", () => {
  it("allows private network indexer URLs", () => {
    expect(() => assertSafeIndexerUrl("http://192.168.1.1:9117")).not.toThrow();
  });

  it("rejects non-http schemes", () => {
    expect(() => assertSafeIndexerUrl("file:///etc/passwd")).toThrow(/Invalid indexer URL scheme/);
  });

  it("rejects cloud metadata endpoints", () => {
    expect(() => assertSafeIndexerUrl("http://169.254.169.254")).toThrow(/cloud metadata endpoints/);
  });
});
