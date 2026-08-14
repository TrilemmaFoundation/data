import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer, type AddressInfo } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_PORT = 3000;
export const MAX_PORT_ATTEMPTS = 10;
const LOCAL_HOSTS = [undefined, "127.0.0.1", "::1"] as const;
const HOST_UNSUPPORTED = new Set([
  "EADDRNOTAVAIL",
  "EAFNOSUPPORT",
  "EINVAL",
  "ENODEV",
]);

export function parsePort(value: string | undefined): number | null {
  if (!value) return null;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

export function readCliPort(argv: string[]): { port: number | null; rest: string[] } {
  const rest: string[] = [];
  let port: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "-p" || arg === "--port") {
      const nextArg = argv[index + 1];
      if (nextArg !== undefined && !nextArg.startsWith("-")) {
        port = parsePort(nextArg) ?? port;
        index += 1;
      }
      continue;
    }
    if (arg.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length)) ?? port;
      continue;
    }
    rest.push(arg);
  }

  return { port, rest };
}

function canBind(port: number, host?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (host && error.code && HOST_UNSUPPORTED.has(error.code)) {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.listen(host ? { port, host } : { port }, () => {
      const address = server.address() as AddressInfo | null;
      server.close((closeError) => {
        resolve(!closeError && address?.port === port);
      });
    });
  });
}

export async function isPortAvailable(port: number): Promise<boolean> {
  for (const host of LOCAL_HOSTS) {
    if (!(await canBind(port, host))) return false;
  }
  return true;
}

export async function findAvailablePort(
  startPort: number,
  isFree: (port: number) => Promise<boolean> = isPortAvailable,
): Promise<number> {
  const lastPort = Math.min(startPort + MAX_PORT_ATTEMPTS, 65535);
  for (let port = startPort; port <= lastPort; port += 1) {
    if (await isFree(port)) return port;
  }
  throw new Error(`No available port found between ${startPort} and ${lastPort}.`);
}

export function isDevEntry(argv1: string | undefined, moduleUrl: string): boolean {
  if (!argv1) return false;
  return moduleUrl === pathToFileURL(path.resolve(argv1)).href;
}

async function main() {
  const { port: cliPort, rest } = readCliPort(process.argv.slice(2));
  const startPort = cliPort ?? parsePort(process.env.PORT) ?? DEFAULT_PORT;
  const port = await findAvailablePort(startPort);

  if (port !== startPort) {
    console.warn(
      `Port ${startPort} is in use, using available port ${port} instead.`,
    );
  }

  const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
  const child = spawn(
    process.execPath,
    [nextBin, "dev", "--port", String(port), ...rest],
    {
      stdio: "inherit",
      env: { ...process.env, PORT: String(port) },
    },
  );

  const stopChild = (signal: NodeJS.Signals) => {
    if (!child.killed) child.kill(signal);
  };
  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));

  child.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
}

if (isDevEntry(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
