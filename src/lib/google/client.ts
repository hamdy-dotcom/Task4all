// Server-only. Returns an authed Google Calendar client, refreshing tokens as needed.
import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/service";

export class NeverConnectedError extends Error {
  constructor() {
    super("Google Calendar not connected.");
    this.name = "NeverConnectedError";
  }
}

export class ReconnectRequiredError extends Error {
  constructor() {
    super("Google account disconnected — please reconnect.");
    this.name = "ReconnectRequiredError";
  }
}

function makeOAuth2() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

export async function getCalendarClient(userId: string) {
  const supabase = createServiceClient();

  const { data: account } = await supabase
    .from("google_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (!account) throw new NeverConnectedError();
  if (!account.refresh_token) throw new ReconnectRequiredError();

  const oauth2 = makeOAuth2();
  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
  });

  const expiresAt = account.expires_at
    ? new Date(account.expires_at).getTime()
    : 0;

  if (expiresAt < Date.now() + 60_000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      await supabase
        .from("google_accounts")
        .update({
          access_token: credentials.access_token ?? null,
          expires_at: credentials.expiry_date
            ? new Date(credentials.expiry_date).toISOString()
            : null,
          ...(credentials.refresh_token
            ? { refresh_token: credentials.refresh_token }
            : {}),
        })
        .eq("user_id", userId);
      oauth2.setCredentials(credentials);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      if (apiError?.response?.data?.error === "invalid_grant") {
        await supabase
          .from("google_accounts")
          .delete()
          .eq("user_id", userId);
        throw new ReconnectRequiredError();
      }
      throw err;
    }
  }

  return google.calendar({ version: "v3", auth: oauth2 });
}

/** Fetch the Google email stored for a user, or null if not connected. */
export async function getGoogleEmail(userId: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("google_accounts")
    .select("google_email")
    .eq("user_id", userId)
    .single();
  return data?.google_email ?? null;
}
