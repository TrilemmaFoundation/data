import { describe, expect, it } from "vitest";
import { isChicagoTitleCase, toChicagoTitleCase } from "./chicago-title-case";

describe("toChicagoTitleCase", () => {
  it("capitalizes major words and lowercases CMOS small words", () => {
    expect(toChicagoTitleCase("start with a first microproduct")).toBe(
      "Start with a First Microproduct",
    );
    expect(toChicagoTitleCase("browse this theme in the catalog")).toBe(
      "Browse This Theme in the Catalog",
    );
    expect(toChicagoTitleCase("skip to content")).toBe("Skip to Content");
    expect(toChicagoTitleCase("report a problem")).toBe("Report a Problem");
    expect(toChicagoTitleCase("search by topic, provider, or product use")).toBe(
      "Search by Topic, Provider, or Product Use",
    );
    expect(toChicagoTitleCase("list cafes inside a manhattan bounding box")).toBe(
      "List Cafes inside a Manhattan Bounding Box",
    );
    expect(toChicagoTitleCase("summarise recent street crime around one point")).toBe(
      "Summarise Recent Street Crime around One Point",
    );
    expect(toChicagoTitleCase("compare hospitals within one state")).toBe(
      "Compare Hospitals within One State",
    );
  });

  it("keeps first and last words capitalized", () => {
    expect(toChicagoTitleCase("the world we live in")).toBe("The World We Live In");
    expect(toChicagoTitleCase("of mice and men")).toBe("Of Mice and Men");
    expect(toChicagoTitleCase("---")).toBe("---");
    expect(toChicagoTitleCase("word--word")).toBe("Word--Word");
  });

  it("capitalizes after a colon and leaves period-separated titles intact", () => {
    expect(toChicagoTitleCase("choose a dataset. build a microproduct.")).toBe(
      "Choose a Dataset. Build a Microproduct.",
    );
    expect(toChicagoTitleCase("first project: flag risky hours")).toBe(
      "First Project: Flag Risky Hours",
    );
    expect(toChicagoTitleCase("compare U.S. and German yearly generation mix")).toBe(
      "Compare U.S. and German Yearly Generation Mix",
    );
    expect(toChicagoTitleCase("flag recent influenza A wastewater detections")).toBe(
      "Flag Recent Influenza A Wastewater Detections",
    );
    expect(toChicagoTitleCase("profile the past week's earthquakes")).toBe(
      "Profile the Past Week's Earthquakes",
    );
  });

  it("treats hyphenated compounds per CMOS and preserves brands", () => {
    expect(toChicagoTitleCase("build an exact-name SDN lookup")).toBe(
      "Build an Exact-Name SDN Lookup",
    );
    expect(toChicagoTitleCase("map large U.S. airports from the public-domain dump")).toBe(
      "Map Large U.S. Airports from the Public-Domain Dump",
    );
    expect(toChicagoTitleCase("compare one CVE's exploit probability with its KEV status")).toBe(
      "Compare One CVE's Exploit Probability with Its KEV Status",
    );
    expect(toChicagoTitleCase("look up one packaged food by barcode")).toBe(
      "Look Up One Packaged Food by Barcode",
    );
    expect(toChicagoTitleCase("legislation.gov.uk")).toBe("legislation.gov.uk");
    expect(toChicagoTitleCase("openFDA food enforcement reports")).toBe(
      "openFDA Food Enforcement Reports",
    );
    expect(toChicagoTitleCase("deps.dev package graph")).toBe("deps.dev Package Graph");
    expect(toChicagoTitleCase("O*NET occupational database")).toBe(
      "O*NET Occupational Database",
    );
  });

  it("is idempotent and detectable", () => {
    const titled = toChicagoTitleCase("track regulatory change");
    expect(toChicagoTitleCase(titled)).toBe(titled);
    expect(isChicagoTitleCase(titled)).toBe(true);
    expect(isChicagoTitleCase("track regulatory change")).toBe(false);
    expect(toChicagoTitleCase("USAspending federal awards")).toBe(
      "USAspending Federal Awards",
    );
  });
});
