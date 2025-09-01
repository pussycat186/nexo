import { describe, it, expect } from "vitest";
import { canonicalStringify, canonicalHashHex } from "../server/crypto/canonicalJson";

describe("canonical JSON", () => {
  it("stable key order & NFC strings", () => {
    const a = { b: 1, a: "cafe\u0301" };         // "cafe" + combining acute
    const b = { a: "café", b: 1 };               // precomposed
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
    expect(canonicalHashHex(a)).toBe(canonicalHashHex(b));
  });

  it("arrays preserved; objects sorted", () => {
    const x = { z: [3,2,1], a: { y: 1, x: 2 } };
    const y = { a: { x: 2, y: 1 }, z: [3,2,1] };
    expect(canonicalStringify(x)).toBe(canonicalStringify(y));
  });
});