import { env } from "cloudflare:workers";

type DiscordBindings = {
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_REDIRECT_URI?: string;
  BOTNEXUS_SESSION_KEY?: string;
  BOTNEXUS_ADMIN_IDS?: string;
};

export type DiscordSession = {
  accessToken: string;
  expiresAt: number;
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
    email: string | null;
    verified: boolean;
  };
};

const SESSION_COOKIE = "botnexus_session";
const STATE_COOKIE = "botnexus_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function isDiscordAdmin(userId: string): boolean {
  const bindings = env as unknown as DiscordBindings;
  const adminIds = (bindings.BOTNEXUS_ADMIN_IDS ?? "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export function getDiscordConfig() {
  const bindings = env as unknown as DiscordBindings;
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, BOTNEXUS_SESSION_KEY } = bindings;
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI || !BOTNEXUS_SESSION_KEY) {
    throw new Error("DISCORD_AUTH_NOT_CONFIGURED");
  }
  return { clientId: DISCORD_CLIENT_ID, clientSecret: DISCORD_CLIENT_SECRET, redirectUri: DISCORD_REDIRECT_URI, sessionKey: BOTNEXUS_SESSION_KEY };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getEncryptionKey(encoded: string): Promise<CryptoKey> {
  const raw = fromBase64Url(encoded);
  if (raw.byteLength !== 32) throw new Error("BOTNEXUS_SESSION_KEY_INVALID");
  return crypto.subtle.importKey("raw", toArrayBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSession(session: DiscordSession, encodedKey: string): Promise<string> {
  const key = await getEncryptionKey(encodedKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(session));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptSession(value: string, encodedKey: string): Promise<DiscordSession | null> {
  try {
    const [ivPart, ciphertextPart] = value.split(".");
    if (!ivPart || !ciphertextPart) return null;
    const key = await getEncryptionKey(encodedKey);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(fromBase64Url(ivPart)) }, key, toArrayBuffer(fromBase64Url(ciphertextPart)));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!parsed || typeof parsed !== "object") return null;
    const session = parsed as DiscordSession;
    if (typeof session.accessToken !== "string" || typeof session.expiresAt !== "number" || !session.user?.id) return null;
    return session;
  } catch {
    return null;
  }
}

export function createRandomState(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export function sessionCookieName() { return SESSION_COOKIE; }
export function stateCookieName() { return STATE_COOKIE; }
export function sessionMaxAge() { return SESSION_MAX_AGE; }

export function secureCookie(requestUrl: string) {
  return new URL(requestUrl).protocol === "https:";
}
