import { emailShell, esc } from "./shell";

export interface MilestoneRow {
  title: string;
  status: string;
  rejection_reason: string | null;
}

interface Opts {
  recipientRole: "creator" | "assignee";
  itemTitle: string;
  itemType: string;
  pathLabel: string;
  priority: string;
  approverName: string;
  // creator view
  assigneeNames?: string[];
  // assignee view
  creatorName?: string;
  dueDate?: string; // already formatted, e.g. "31 Aug 2026" or "No due date"
  description?: string | null;
  itemUrl: string;
  milestones?: MilestoneRow[];
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#DC2626",
  high: "#D97706",
  medium: "#2563EB",
  low: "#6B7280",
};
const PRIORITY_BG: Record<string, string> = {
  critical: "#FEF2F2",
  high: "#FFFBEB",
  medium: "#EFF6FF",
  low: "#F9FAFB",
};
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function milestoneBlock(milestones: MilestoneRow[]): string {
  if (!milestones.length) return "";
  const approvedCount = milestones.filter((m) => m.status === "approved").length;
  const rows = milestones
    .map((m) => {
      if (m.status === "approved") {
        return `<tr><td style="padding:9px 14px;border-bottom:1px solid #F0F0F0;font-family:${FONT};">
          <span style="color:#15803D;font-weight:700;margin-right:8px;">&#10003;</span>
          <span style="font-size:14px;color:#1A1A1A;">${esc(m.title)}</span>
        </td></tr>`;
      } else if (m.status === "rejected") {
        return `<tr><td style="padding:9px 14px;border-bottom:1px solid #F0F0F0;font-family:${FONT};">
          <span style="color:#DC2626;font-weight:700;margin-right:8px;">&#10007;</span>
          <span style="font-size:14px;color:#9CA3AF;text-decoration:line-through;">${esc(m.title)}</span>
          ${m.rejection_reason ? `<br><span style="font-size:12px;color:#DC2626;padding-left:22px;display:block;margin-top:3px;">${esc(m.rejection_reason)}</span>` : ""}
        </td></tr>`;
      }
      return `<tr><td style="padding:9px 14px;border-bottom:1px solid #F0F0F0;font-family:${FONT};">
        <span style="color:#D97706;margin-right:8px;">&bull;</span>
        <span style="font-size:14px;color:#6B7280;">${esc(m.title)}</span>
      </td></tr>`;
    })
    .join("");

  return `
  <div style="margin:20px 0;border:1px solid #E8E8E8;border-radius:6px;overflow:hidden;">
    <div style="background:#F9FAFB;padding:10px 14px;border-bottom:1px solid #E8E8E8;">
      <span style="font-family:${FONT};font-size:13px;font-weight:600;color:#374151;">Milestones &mdash; ${approvedCount} of ${milestones.length} approved</span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
  </div>`;
}

function infoBlock(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:8px 14px;font-family:${FONT};font-size:13px;font-weight:600;color:#6B7280;width:110px;vertical-align:top;white-space:nowrap;">${esc(label)}</td>
      <td style="padding:8px 14px;font-family:${FONT};font-size:13px;color:#374151;vertical-align:top;">${esc(value)}</td>
    </tr>`
    )
    .join("");

  return `
  <div style="margin:20px 0;border:1px solid #E8E8E8;border-radius:6px;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">${cells}</table>
  </div>`;
}

export function approvedEmail(opts: Opts): { html: string; text: string; subject: string } {
  const {
    recipientRole,
    itemTitle,
    itemType,
    pathLabel,
    priority,
    approverName,
    assigneeNames = [],
    creatorName = "",
    dueDate = "No due date",
    description,
    itemUrl,
    milestones,
  } = opts;

  const pColor = PRIORITY_COLOR[priority] ?? "#6B7280";
  const pBg = PRIORITY_BG[priority] ?? "#F9FAFB";

  const badges = `
    <div style="margin-bottom:20px;">
      <span style="display:inline-block;background-color:#DCFCE7;color:#15803D;font-family:${FONT};font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;">Approved</span>
      &nbsp;
      <span style="display:inline-block;background-color:${pBg};color:${pColor};font-family:${FONT};font-size:11px;font-weight:600;padding:4px 12px;border-radius:999px;text-transform:capitalize;">${esc(priority)} priority</span>
    </div>`;

  let content: string;
  let textBody: string;
  let subject: string;
  let footerReason: string;

  if (recipientRole === "creator") {
    const assigneeLine =
      assigneeNames.length > 0
        ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">Assigned to <strong>${esc(assigneeNames.join(", "))}</strong>.</p>`
        : "";

    content = `
      ${badges}
      <p style="margin:0;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">
        <strong>${esc(approverName)}</strong> approved your ${esc(itemType)} and set priority to <strong>${esc(priority)}</strong>.
      </p>
      ${assigneeLine}
      ${milestones ? milestoneBlock(milestones) : ""}`;

    const assigneeText =
      assigneeNames.length > 0 ? `\nAssigned to: ${assigneeNames.join(", ")}` : "";
    textBody = `${approverName} approved your ${itemType} and set priority to ${priority}.${assigneeText}`;
    subject = `Approved: ${itemTitle}`;
    footerReason = `You received this because you created this ${itemType} in task4all.`;
  } else {
    // assignee — introduce the item fully
    const infoRows: Array<[string, string]> = [
      ["Created by", creatorName],
      ["Due", dueDate],
    ];
    if (description) infoRows.push(["Description", description]);

    content = `
      ${badges}
      <p style="margin:0;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">
        You've been assigned to a new ${esc(itemType)}. <strong>${esc(approverName)}</strong> approved it and set priority to <strong>${esc(priority)}</strong>.
      </p>
      ${infoBlock(infoRows)}
      ${milestones ? milestoneBlock(milestones) : ""}`;

    const descText = description ? `\nDescription: ${description}` : "";
    textBody = `You've been assigned to a new ${itemType}. ${approverName} approved it and set priority to ${priority}.\n\nCreated by: ${creatorName}\nDue: ${dueDate}${descText}`;
    subject = `You've been assigned: ${itemTitle}`;
    footerReason = `You received this because you were assigned to this ${itemType} in task4all.`;
  }

  const milestoneText =
    milestones && milestones.length > 0
      ? `\n\nMilestones (${milestones.filter((m) => m.status === "approved").length}/${milestones.length} approved):\n` +
        milestones
          .map((m) => {
            const icon =
              m.status === "approved" ? "✓" : m.status === "rejected" ? "✗" : "•";
            let line = `${icon} ${m.title}`;
            if (m.status === "rejected" && m.rejection_reason)
              line += `\n   Reason: ${m.rejection_reason}`;
            return line;
          })
          .join("\n")
      : "";

  const html = emailShell({ itemTitle, pathLabel, content, itemUrl, footerReason });
  const text = `task4all — Approved\n\n${itemTitle}${pathLabel ? "\n" + pathLabel : ""}\n\n${textBody}${milestoneText}\n\nView: ${itemUrl}`;

  return { html, text, subject };
}
