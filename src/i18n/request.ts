import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { AbstractIntlMessages } from "next-intl";

// Static imports so Turbopack tracks these files as real dependencies
// and invalidates its module cache whenever either JSON file changes.
import enRaw from "../messages/en.json";
import arRaw from "../messages/ar.json";

const enMessages = enRaw as AbstractIntlMessages;
const arMessages = arRaw as AbstractIntlMessages;

const SUPPORTED = ["en", "ar"] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

function isSupported(v: string | undefined): v is SupportedLocale {
  return SUPPORTED.includes(v as SupportedLocale);
}

// Walk a nested message object by dot-separated key path.
function getNestedValue(obj: AbstractIntlMessages, parts: string[]): string | undefined {
  let node: unknown = obj;
  for (const part of parts) {
    if (node != null && typeof node === "object") {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  function makeConfig(locale: SupportedLocale) {
    const messages = locale === "en" ? enMessages : arMessages;
    return {
      locale,
      messages,
      onError(error: { code: string; message: string }) {
        if (error.code !== "MISSING_MESSAGE") {
          console.error("[next-intl]", error.message);
        }
      },
      getMessageFallback({
        namespace,
        key,
      }: {
        namespace?: string;
        key: string;
        error: unknown;
      }): string {
        const parts = [namespace, key].filter(Boolean) as string[];
        return getNestedValue(enMessages, parts) ?? (parts.at(-1) ?? key);
      },
    };
  }

  if (isSupported(cookieLocale)) return makeConfig(cookieLocale);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("locale")
        .eq("id", user.id)
        .single();
      const profileLocale = profile?.locale;
      if (isSupported(profileLocale)) return makeConfig(profileLocale);
    }
  } catch {
    // swallow — unauthenticated pages (login) land here
  }

  return makeConfig("en");
});
