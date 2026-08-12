import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifyState } from "@/lib/google/auth";
import { createServiceClient } from "@/lib/supabase/service";

// TODO(deploy): add https://task4all.com/api/google/callback to the Google Cloud Console
// OAuth 2.0 redirect URIs before going live at task4all.com.
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${APP_URL}/meetings?error=google_denied`);
  }

  const userId = verifyState(state);
  if (!userId) {
    return NextResponse.redirect(`${APP_URL}/meetings?error=invalid_state`);
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  try {
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const userInfoApi = google.oauth2({ version: "v2", auth: oauth2 });
    const { data: userInfo } = await userInfoApi.userinfo.get();

    if (!userInfo.email) {
      return NextResponse.redirect(`${APP_URL}/meetings?error=no_email`);
    }

    const supabase = createServiceClient();
    await supabase.from("google_accounts").upsert(
      {
        user_id: userId,
        google_email: userInfo.email,
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        scopes: tokens.scope?.split(" ") ?? null,
        scopes_text: tokens.scope ?? null,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(`${APP_URL}/meetings?connected=1`);
  } catch (err) {
    console.error("[google/callback]", err);
    return NextResponse.redirect(`${APP_URL}/meetings?error=exchange_failed`);
  }
}
