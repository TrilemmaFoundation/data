import { createServer, type AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  findAvailablePort,
  isDevEntry,
  isPortAvailable,
  MAX_PORT_ATTEMPTS,
  parsePort,
  readCliPort,
} from "./dev";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

async function listen(port = 0, host = "127.0.0.1") {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ port, host }, () => resolve());
  });
  servers.push(server);
  return (server.address() as AddressInfo).port;
}

describe("parsePort", () => {
  it("accepts usable TCP ports and rejects the rest", () => {
    expect(parsePort("3000")).toBe(3000);
    expect(parsePort("65535")).toBe(65535);
    expect(parsePort(undefined)).toBeNull();
    expect(parsePort("")).toBeNull();
    expect(parsePort("0")).toBeNull();
    expect(parsePort("-1")).toBeNull();
    expect(parsePort("65536")).toBeNull();
    expect(parsePort("3000.5")).toBeNull();
    expect(parsePort("abc")).toBeNull();
  });
});

describe("readCliPort", () => {
  it("reads port flags without dropping other Next.js args", () => {
    expect(readCliPort(["--webpack"])).toEqual({
      port: null,
      rest: ["--webpack"],
    });
    expect(readCliPort(["-p", "4000", "--webpack"])).toEqual({
      port: 4000,
      rest: ["--webpack"],
    });
    expect(readCliPort(["--port", "4001"])).toEqual({
      port: 4001,
      rest: [],
    });
    expect(readCliPort(["--port=4002", "--turbo"])).toEqual({
      port: 4002,
      rest: ["--turbo"],
    });
  });

  it("does not swallow the next flag when a port value is missing or invalid", () => {
    expect(readCliPort(["-p", "--webpack"])).toEqual({
      port: null,
      rest: ["--webpack"],
    });
    expect(readCliPort(["--port", "nope", "--webpack"])).toEqual({
      port: null,
      rest: ["--webpack"],
    });
    expect(readCliPort(["--port=nope", "-p", "4010"])).toEqual({
      port: 4010,
      rest: [],
    });
  });
});

describe("findAvailablePort", () => {
  it("returns the first free port and stops at the attempt limit", async () => {
    const busy = new Set([3000, 3001]);
    await expect(
      findAvailablePort(3000, async (port) => !busy.has(port)),
    ).resolves.toBe(3002);

    await expect(
      findAvailablePort(3000, async () => false),
    ).rejects.toThrow("No available port found between 3000 and 3010.");

    await expect(
      findAvailablePort(65530, async () => false),
    ).rejects.toThrow("No available port found between 65530 and 65535.");
  });

  it("covers the configured number of attempts", async () => {
    const seen: number[] = [];
    await expect(
      findAvailablePort(4000, async (port) => {
        seen.push(port);
        return false;
      }),
    ).rejects.toThrow(/4000 and 4010/);
    expect(seen).toHaveLength(MAX_PORT_ATTEMPTS + 1);
    expect(seen[0]).toBe(4000);
    expect(seen.at(-1)).toBe(4010);
  });
});

describe("isPortAvailable", () => {
  it("reports an occupied localhost port as busy", async () => {
    const port = await listen();
    await expect(isPortAvailable(port)).resolves.toBe(false);
  });
});

describe("isDevEntry", () => {
  it("matches the executed script path and ignores other entrypoints", () => {
    const moduleUrl = "file:///Volumes/Mac%20SSD/foundation/data/scripts/dev.ts";
    expect(
      isDevEntry("/Volumes/Mac SSD/foundation/data/scripts/dev.ts", moduleUrl),
    ).toBe(true);
    expect(isDevEntry(undefined, moduleUrl)).toBe(false);
    expect(
      isDevEntry("/Volumes/Mac SSD/foundation/data/node_modules/vitest/dist/cli.js", moduleUrl),
    ).toBe(false);
  });
});
