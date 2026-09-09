import { describe, expect, it } from "vitest";
import { buildUpiPayUrl, isValidVpa, normalizeVpa } from "./upi";

describe("isValidVpa", () => {
  it("accepts typical VPA shapes", () => {
    expect(isValidVpa("ramesh.kumar@okhdfcbank")).toBe(true);
    expect(isValidVpa("9876543210@ybl")).toBe(true);
    expect(isValidVpa("shop_name-1@paytm")).toBe(true);
  });

  it("rejects strings without an @ or a bank handle", () => {
    expect(isValidVpa("not-a-vpa")).toBe(false);
    expect(isValidVpa("@okhdfcbank")).toBe(false);
    expect(isValidVpa("name@")).toBe(false);
  });

  it("rejects a VPA carrying an injected query parameter", () => {
    // A crafted value like this is exactly what buildUpiPayUrl must never
    // let reach the deep link unescaped/unvalidated.
    expect(isValidVpa("attacker@bank&am=1&pa=other@bank")).toBe(false);
  });
});

describe("buildUpiPayUrl", () => {
  it("builds a upi://pay link with all fields present", () => {
    const url = buildUpiPayUrl({
      vpa: "Ramesh@OKHDFCBANK",
      payeeName: "Ramesh Kumar",
      amount: 9500,
      note: "Salary September 2026",
    });
    expect(url).toBe(
      "upi://pay?pa=ramesh%40okhdfcbank&pn=Ramesh+Kumar&am=9500.00&cu=INR&tn=Salary+September+2026",
    );
  });

  it("normalizes the VPA to lowercase", () => {
    const url = buildUpiPayUrl({ vpa: "Name@Bank", payeeName: "x", amount: 1, note: "n" });
    expect(new URL(url).searchParams.get("pa")).toBe(normalizeVpa("Name@Bank"));
  });

  it("percent-encodes a payee name containing '&' or '=' instead of letting it inject params", () => {
    const url = buildUpiPayUrl({
      vpa: "helper@bank",
      payeeName: "Name&am=1&pa=attacker@bank",
      amount: 500,
      note: "note",
    });
    // The raw '&'/'=' must not appear unescaped -- only one 'am=' and one
    // 'pa=' may exist in the whole URL (the legitimate ones).
    expect(url.match(/am=/g)?.length).toBe(1);
    expect(url.match(/pa=/g)?.length).toBe(1);
    expect(url).toContain("Name%26am%3D1%26pa%3Dattacker%40bank");
  });

  it("rejects an invalid VPA", () => {
    expect(() =>
      buildUpiPayUrl({ vpa: "not a vpa", payeeName: "x", amount: 100, note: "n" }),
    ).toThrow();
  });

  it("rejects a non-positive amount", () => {
    expect(() =>
      buildUpiPayUrl({ vpa: "helper@bank", payeeName: "x", amount: 0, note: "n" }),
    ).toThrow();
    expect(() =>
      buildUpiPayUrl({ vpa: "helper@bank", payeeName: "x", amount: -5, note: "n" }),
    ).toThrow();
  });
});
