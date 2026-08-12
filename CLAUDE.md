# NML Compliance Tracker

Internal OKR/task system for NML's compliance team. All teams work inside it.

## Stack
Next.js 16 (App Router, src/) · React 19 · TypeScript · Tailwind v4 · Supabase · Vercel

## Non-negotiables
- Tailwind v4: design tokens live in `src/app/globals.css` under `@theme`. There is NO `tailwind.config.ts`. Never create one.
- All UI must follow `docs/DESIGN_SYSTEM.md` exactly. Read it before writing any component.
- Types come from `src/lib/database.types.ts` (generated). Never hand-write DB types. If the schema changes, regenerate.
- Supabase clients: `src/lib/supabase/client.ts` (browser) and `server.ts` (server). Never instantiate Supabase inline.
- Never use the service role key in client code or in any route reachable without an auth check.
- RLS is the security boundary and is already enforced in Postgres. Do not re-implement permission logic in the UI as a substitute — use it only to hide controls the user can't use.

## Data model
Single table `work_items` holds all four levels via `type` enum (objective | initiative | task | subtask) and self-referencing `parent_id`. Hierarchy is enforced by DB triggers.

Related: `work_item_assignees`, `work_item_attachments`, `work_item_comments`, `work_item_history`, `profiles`, `teams`, `meetings`, `meeting_attendees`, `meeting_topics`, `meeting_minutes`, `notifications`, `google_accounts`.

Views: `v_work_item_tree`, `v_pending_approvals`. RPCs: `completion_blockers(uuid)`, `my_role()`, `my_team()`, `can_view_item(uuid)`, `is_assigned(uuid)`.

## Rules the DB already enforces — do not duplicate or contradict
- Progress is DERIVED, never set by hand. Leaf item = 0 or 100. Parent = sum(child.weight × child.progress) / 100.
- A parent cannot be manually marked done. Call `completion_blockers(id)` before showing the button; if it returns rows, show them as the reason.
- Parents auto-complete when the last child finishes, and bubble up.
- Approved siblings' weights cannot exceed 100. Unallocated weight is shown, never hidden.
- Objectives with `is_continuous = true` have no weights, no %, and can never complete. Show "Ongoing · X of Y complete" instead of a progress bar.

## Roles
- `super_admin` — sees and edits everything. Creates objectives. Approves initiatives.
- `admin` — reads everything. Creates initiatives. Approves tasks. Cannot edit items owned by others.
- `team_leader` — sees his team's items plus anything assigned to him. Creates tasks. Approves sub-tasks.
- `team_member` — sees only items assigned to him plus the read-only parent chain. Creates sub-tasks.

`profiles.title` is free text and display-only. It carries NO permissions. Only `profiles.role` does.

Priority is set by the APPROVER during approval, never by the creator.

## Conventions
- Server Components by default. `"use client"` only where interaction requires it.
- Mutations go through Server Actions in `src/app/**/actions.ts`.
- Validate every input with zod before it reaches Supabase.
- Arabic and English both appear in content. Use CSS logical properties everywhere — never `left`/`right`.
- Wrap numerals in Arabic text with `<bdi>`. Use `.tnum` on all figures.
