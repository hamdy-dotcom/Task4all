import { emailShell, esc } from "./shell";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

interface Opts {
  itemTitle: string;
  itemType: string;
  pathLabel: string;
  creatorName: string;
  dueDate: string; // formatted, e.g. "31 Aug 2026" or "No due date"
  description?: string | null;
  classification?: string | null; // initiatives only
  milestoneCount?: number; // subtasks only
  itemUrl: string; // links to /approvals
}

export function approvalRequestEmail(opts: Opts): { html: string; text: string } {
  const {
    itemTitle,
    itemType,
    pathLabel,
    creatorName,
    dueDate,
    description,
    classification,
    milestoneCount,
    itemUrl,
  } = opts;

  const infoRows: Array<[string, string]> = [["Created by", creatorName], ["Due", dueDate]];
  if (classification) infoRows.push(["Classification", classification]);
  if (milestoneCount !== undefined) infoRows.push(["Milestones", String(milestoneCount)]);
  if (description) infoRows.push(["Description", description]);

  const infoBlock = `
  <div style="margin:20px 0;border:1px solid #E8E8E8;border-radius:6px;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${infoRows
        .map(
          ([label, value]) => `
      <tr>
        <td style="padding:8px 14px;font-family:${FONT};font-size:13px;font-weight:600;color:#6B7280;width:120px;vertical-align:top;white-space:nowrap;">${esc(label)}</td>
        <td style="padding:8px 14px;font-family:${FONT};font-size:13px;color:#374151;vertical-align:top;">${esc(value)}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;

  const content = `
    <div style="margin-bottom:20px;">
      <span style="display:inline-block;background-color:#FFFBEB;color:#B45309;font-family:${FONT};font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;">Needs approval</span>
    </div>
    <p style="margin:0;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">
      <strong>${esc(creatorName)}</strong> created a new ${esc(itemType)} and it needs your approval.
    </p>
    ${infoBlock}`;

  const html = emailShell({
    itemTitle,
    pathLabel,
    content,
    itemUrl,
    footerReason: "You received this because you are a Super Admin in task4all.",
  });

  const infoText = infoRows.map(([l, v]) => `${l}: ${v}`).join("\n");
  const text = `task4all — Needs approval\n\n${itemTitle}${pathLabel ? "\n" + pathLabel : ""}\n\n${creatorName} created a new ${itemType} and it needs your approval.\n\n${infoText}\n\nReview and approve: ${itemUrl}`;

  return { html, text };
}
