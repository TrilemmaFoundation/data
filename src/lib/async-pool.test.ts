import { describe, expect, it } from "vitest";
import { mapPool } from "./async-pool";

describe("mapPool", () => {
  it("returns an empty list without calling the mapper", async () => {
    const calls: number[] = [];
    await expect(mapPool([], 3, async (value: number) => {
      calls.push(value);
      return value;
    })).resolves.toEqual([]);
    expect(calls).toEqual([]);
  });

  it("preserves order and treats non-positive concurrency as 1", async () => {
    const seen: number[] = [];
    await expect(
      mapPool([3, 2, 1], 0, async (value) => {
        seen.push(value);
        return value * 10;
      }),
    ).resolves.toEqual([30, 20, 10]);
    expect(seen).toEqual([3, 2, 1]);
  });

  it("never exceeds the requested concurrency", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const result = await mapPool([1, 2, 3, 4], 2, async (value) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return value;
    });
    expect(result).toEqual([1, 2, 3, 4]);
    expect(maxInFlight).toBe(2);
  });
});
