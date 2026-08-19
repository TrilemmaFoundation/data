import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { beforeSend, PAGEVIEW_ANALYTICS_SCRIPT, redactAnalyticsUrl } from "./analytics";

describe("analytics redaction", () => {
  it("strips raw catalog search queries from pageview URLs", () => {
    expect(PAGEVIEW_ANALYTICS_SCRIPT).toBe("@vercel/analytics");
    expect(redactAnalyticsUrl("/?q=secret+query&theme=Weather")).toBe(
      "/?theme=Weather",
    );
    expect(redactAnalyticsUrl("/datasets/nws-weather-api")).toBe(
      "/datasets/nws-weather-api",
    );
    expect(redactAnalyticsUrl("http://[")).toBe("http://[");
  });

  it("passes through events without URLs and redacts events with URLs", () => {
    expect(
      beforeSend({ type: "pageview", url: "/datasets/nws-weather-api" }),
    ).toEqual({
      type: "pageview",
      url: "/datasets/nws-weather-api",
    });
    expect(beforeSend({ type: "pageview", url: "/?q=name@example.com" })).toEqual({
      type: "pageview",
      url: "/",
    });
  });

  it("does not define or import custom analytics events", () => {
    const wrapper = fs.readFileSync("src/components/PageviewAnalytics.tsx", "utf8");
    expect(wrapper).toContain(PAGEVIEW_ANALYTICS_SCRIPT);
    expect(wrapper).not.toMatch(/\btrack\b/);
    expect(wrapper).not.toMatch(/custom.?event/i);
  });
});
