import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const PEOPLE = [
  ["Dr. Ehab Nasser",        "eihab@nmlapp.sa",   "admin",       "Chief Executive Officer"],
  ["Karim El-Basha",         "karim@nmlapp.sa",   "super_admin", "Chief Product & Governance Officer"],
  ["Ahmed Hamdy",            "A.Hamdy@nmlapp.sa", "super_admin", "Business Intelligence & Merchant Analytics"],
  ["Ayman Farouk",           "ayman@nmlapp.sa",   "admin",       "VP Commercial — Retail Partnerships & Field"],
  ["Mohamed Hamdy Ghazouly", "muhamad@nmlapp.sa", "team_leader", "Chief Technology Officer"],
  ["Nouran El-Sherif",       "nouran@nmlapp.sa",  "team_leader", "Head of Operations — Field & Supply Chain"],
  ["Gamal Farid",            "gamal@nmlapp.sa",   "team_leader", "Finance, Settlement & Custody Control"],
  ["Dr. Mohamed Magdy",      "m.magdy@nmlapp.sa", "team_leader", "Marketing & Communications"],
  ["Ahmed Al-Haddad",        "ahmed.h@nmlapp.sa", "team_member", "Field Team & Strategic Suppliers"],
  ["Ahmed Ali",              "a.ali@nmlapp.sa",   "team_member", "Allocation Analyst & Modelling"],
  ["Banan Alfaris",          "banan@nmlapp.sa",   "team_member", "Merchant Contracts & Assortment"],
  ["Aseel Alkhateeb",        "aseel@nmlapp.sa",   "team_member", "Merchant Success & Activation"],
  ["Dina Nazif",             "dina@nmlapp.sa",    "team_member", "Inventory & Replenishment Planner"],
  ["Hager Mohamed",          "hager@nmlapp.sa",   "team_member", "Field Execution & Performance Tracking"],
  ["Shahab Dabour",          "shahab@nmlapp.sa",  "team_member", "Merchandiser / Field Agent"],
  ["Mohammad Hamdy",         "m.hamdy@nmlapp.sa", "team_member", "Custody & Settlement Officer"],
  ["Mohamad Hamdy",          "hamdy@nmlapp.sa",   "team_member", "Engineer — Technology"],
];

const pw = () => randomBytes(9).toString("base64").replace(/[+/=]/g, "") + "9aA!";
const rows = [["Name","Email","Password","Access role","Title"]];

for (const [name, email, role, title] of PEOPLE) {
  const password = pw();
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: name },
  });
  if (error) { console.error(`FAIL ${email}: ${error.message}`); continue; }
  const { error: pErr } = await db.from("profiles")
    .update({ full_name: name, role, title })
    .eq("id", data.user.id);
  if (pErr) console.error(`PROFILE FAIL ${email}: ${pErr.message}`);
  rows.push([name, email, password, role, title]);
  console.log(`ok  ${email}`);
}

writeFileSync("nml-credentials.csv",
  rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n"));
console.log(`\nWrote nml-credentials.csv — ${rows.length - 1} accounts`);
