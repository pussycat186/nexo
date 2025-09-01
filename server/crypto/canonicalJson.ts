import { sha256 } from "@noble/hashes/sha2.js";

function normalize(value: any, seen: WeakSet<object>): any {
  if (value === null || typeof value !== "object") {
    if (typeof value === "string") return value.normalize("NFC");
    if (Number.isNaN(value) || value === Infinity || value === -Infinity) return null;
    return value;
  }
  if (Array.isArray(value)) return value.map(v => normalize(v, seen));
  if (seen.has(value)) throw new TypeError("circular structure");
  seen.add(value);
  const out: Record<string, any> = {};
  for (const k of Object.keys(value).sort()) out[k] = normalize(value[k], seen);
  return out;
}

export function canonicalStringify(input: unknown): string {
  const n = normalize(input as any, new WeakSet());
  return JSON.stringify(n);
}

export function sha256Hex(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = sha256(bytes);
  return Array.from(digest, (b: number) => b.toString(16).padStart(2, "0")).join("");
}

export function canonicalHashHex(obj: unknown): string {
  return sha256Hex(canonicalStringify(obj));
}