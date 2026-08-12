// Server-only. Build the OAuth consent URL and sign/verify the state param.
import crypto from "crypto";

const SECRET = process.env.CRON_SECRET!;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function buildAuthUrl(userId: string): string {
  const state = buildState(userId);
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function buildState(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}~${sig}`;
}

/** Returns userId if state is valid and fresh (< 10 min), null otherwise. */
export function verifyState(state: string): string | null {
  try {
    const idx = state.lastIndexOf("~");
    if (idx === -1) return null;
    const encoded = state.slice(0, idx);
    const sig = state.slice(idx + 1);
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    const expBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = Buffer.from(encoded, "base64url").toString();
    const colonIdx = payload.lastIndexOf(":");
    const userId = payload.slice(0, colonIdx);
    const ts = parseInt(payload.slice(colonIdx + 1), 10);
    if (!userId || isNaN(ts)) return null;
    if (Date.now() - ts > 10 * 60 * 1000) return null;
    return userId;
  } catch {
    return null;
  }
}
