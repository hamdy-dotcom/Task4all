import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import InitiativeForm from "@/components/initiatives/InitiativeForm";

export default async function NewInitiativePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role !== "super_admin" && role !== "admin") redirect("/initiatives");

  const t = await getTranslations("initiatives");

  const [{ data: northStar }, { data: teams }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("v_work_item_tree")
        .select("id")
        .eq("type", "objective")
        .single(),
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, full_name, title, role")
        .eq("is_active", true)
        .order("full_name"),
    ]);

  if (!northStar?.id) {
    return (
      <div style={{ maxWidth: 600 }}>
        <p style={{ fontSize: 14, color: "var(--color-crit)" }}>
          {t("northStarNotFound")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="flex items-center" style={{ marginBottom: 24, gap: 8 }}>
        <Link
          href="/initiatives"
          className="flex items-center"
          style={{
            fontSize: 14,
            color: "var(--color-ink-400)",
            textDecoration: "none",
            gap: 4,
          }}
        >
          <ChevronLeft size={16} />
          {t("title")}
        </Link>
        <span style={{ fontSize: 14, color: "var(--color-ink-300)" }}>/</span>
        <span
          style={{
            fontSize: 14,
            color: "var(--color-ink-900)",
            fontWeight: 500,
          }}
        >
          {t("newInitiative")}
        </span>
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 600,
          lineHeight: "26px",
          color: "var(--color-ink-900)",
          marginBottom: 24,
        }}
      >
        {t("newInitiative")}
      </h2>

      <InitiativeForm
        northStarId={northStar.id}
        teams={teams ?? []}
        profiles={(profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          title: p.title,
          role: p.role,
        }))}
      />
    </div>
  );
}
