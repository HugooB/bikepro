import { afterEach, describe, expect, it } from "vitest";
import { authorizeUrl, hasRequiredScope, stravaConfig } from "./api";
import { withOutcome } from "./oauth-state";

afterEach(() => {
  delete process.env.STRAVA_CLIENT_ID;
  delete process.env.STRAVA_CLIENT_SECRET;
  delete process.env.APP_URL;
});

describe("stravaConfig", () => {
  it("is off until the client id and secret are set", () => {
    expect(stravaConfig()).toBeNull();
    process.env.STRAVA_CLIENT_ID = "123";
    process.env.STRAVA_CLIENT_SECRET = "s";
    expect(stravaConfig("http://bikes.local:3000")?.redirectUri).toBe(
      "http://bikes.local:3000/api/strava/callback",
    );
    process.env.APP_URL = "https://bikes.example.com";
    expect(stravaConfig("http://internal:3000")?.redirectUri).toBe(
      "https://bikes.example.com/api/strava/callback",
    );
  });
});

describe("authorizeUrl", () => {
  it("asks for the bike scopes only and carries the state", () => {
    const url = new URL(
      authorizeUrl({ clientId: "123", clientSecret: "s", redirectUri: "http://x/cb" }, "st"),
    );
    expect(url.origin).toBe("https://www.strava.com");
    expect(url.searchParams.get("scope")).toBe("read,profile:read_all");
    expect(url.searchParams.get("state")).toBe("st");
  });
});

describe("hasRequiredScope", () => {
  it("needs every scope BikePro asked for", () => {
    expect(hasRequiredScope("read,profile:read_all")).toBe(true);
    expect(hasRequiredScope("read,activity:read,profile:read_all")).toBe(true);
    expect(hasRequiredScope("read")).toBe(false);
    expect(hasRequiredScope(null)).toBe(false);
  });
});

describe("withOutcome", () => {
  it("adds the outcome to the return path", () => {
    expect(withOutcome("/settings", "connected")).toBe("/settings?strava=connected");
    expect(withOutcome("/bikes/new?x=1", "denied")).toBe("/bikes/new?x=1&strava=denied");
  });
});
