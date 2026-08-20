import { describe, expect, it } from "vitest";
import { getAllDatasets } from "./datasets";
import {
  attachContractFixtures,
  getProviderContract,
  hasProviderContract,
  jsonValidator,
  mediaTypeOf,
  providerContracts,
} from "./provider-contracts";
import { z } from "zod";

function fixtureToBytes(body: BodyInit): Uint8Array {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return body;
  throw new Error(`unsupported fixture body: ${Object.prototype.toString.call(body)}`);
}

describe("provider contract registry", () => {
  const catalogIds = new Set(getAllDatasets().map((dataset) => dataset.id));
  const entries = Object.entries(providerContracts);

  it("covers existing datasets and never treats prototype keys as contracts", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const id of Object.keys(providerContracts)) {
      expect(catalogIds.has(id)).toBe(true);
    }
    expect(hasProviderContract("constructor")).toBe(false);
    expect(getProviderContract("missing")).toBeUndefined();
  });

  it.each(entries)("accepts the valid %s fixture and rejects the invalid fixture", (
    _id,
    contract,
  ) => {
    expect(contract.validate(fixtureToBytes(contract.valid.body))).toBeNull();
    const invalid = contract.validate(fixtureToBytes(contract.invalid.body));
    expect(invalid).toEqual(expect.stringMatching(contract.invalid.expectedError));
  });

  it("reports missing fixtures when attaching an incomplete map", () => {
    expect(() =>
      attachContractFixtures(
        { example: { url: "https://example.com", contentTypes: ["text/plain"], validate: () => null } },
        {} as never,
      ),
    ).toThrow("missing provider fixtures for example");
  });

  it("parses JSON media types and rejects malformed JSON bodies", () => {
    expect(mediaTypeOf("application/json; charset=utf-8")).toBe("application/json");
    const validate = jsonValidator(z.object({ id: z.string() }));
    expect(validate(new TextEncoder().encode("{"))).toBe("response is not valid JSON");
    expect(validate(new TextEncoder().encode('{"id":"ok"}'))).toBeNull();
  });
});
