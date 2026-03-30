import dns from "node:dns/promises";
import net from "node:net";

/**
 * SSRF protection — validates that a URL does not resolve to internal/private networks.
 * Used by all endpoints that fetch user-supplied URLs.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "metadata.google.internal", "metadata.google.com",
]);

function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, "");

  if (net.isIPv4(normalized)) {
    const parts = normalized.split(".").map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  if (net.isIPv6(normalized)) {
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
    if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    return false;
  }

  return false;
}

export async function validateExternalUrl(url: URL): Promise<boolean> {
  const hostname = url.hostname.toLowerCase();

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (BLOCKED_HOSTNAMES.has(hostname)) return false;
  if (net.isIP(hostname)) return !isPrivateIp(hostname);

  try {
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    for (const addr of [...addresses, ...addresses6]) {
      if (isPrivateIp(addr)) return false;
    }
  } catch {
    // DNS failed — let fetch handle it
  }

  return true;
}
