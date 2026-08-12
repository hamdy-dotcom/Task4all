import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { digestEmail, type DigestItem } from "@/lib/emails/digest";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.NOTIFICATION_FROM_EMAIL ?? "task4all <notifications@nml.sa>";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Fetch all super_admins with emails
  const { data: admins } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "super_admin")
    .eq("is_active", true);

  if (!admins || admins.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  // Fetch pending approval items, oldest first
  const { data: pending } = await supabase
    .from("v_work_item_tree")
    .select("id, title, type, created_by_name, created_at")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });

  if (!pending || pending.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no pending items" });
  }

  const items: DigestItem[] = pending.map((p) => ({
    id: p.id ?? "",
    title: p.title ?? "",
    type: p.type ?? "",
    creatorName: p.created_by_name ?? "Unknown",
    createdAt: p.created_at ?? new Date().toISOString(),
  }));

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Cairo",
  });

  const { html, text } = digestEmail({ pendingItems: items, appUrl: APP_URL, todayLabel });

  let sent = 0;
  await Promise.all(
    admins.map(async (admin) => {
      try {
        await resend.emails.send({
          from: FROM,
          to: admin.email,
          subject: `${items.length} item${items.length !== 1 ? "s" : ""} awaiting your approval — ${todayLabel}`,
          html,
          text,
        });
        sent++;
      } catch (err) {
        console.error("[digest] email failed for", admin.email, err);
      }
    })
  );

  return NextResponse.json({ sent, total: items.length });
}
