import { emailShell, esc } from "./shell";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

interface Opts {
  itemTitle: string;
  itemType: string;
  pathLabel: string;
  reason: string;
  dueDate: string; // formatted, e.g. "31 Aug 2026" or "No due date"
  description?: string | null;
  itemUrl: string;
}

export function rejectedEmail(opts: Opts): { html: string; text: string } {
  const { itemTitle, itemType, pathLabel, reason, dueDate, description, itemUrl } = opts;

  const infoRows = [["Due", dueDate], ...(description ? [["Description", description]] : [])];
  const infoBlock = `
  <div style="margin:20px 0;border:1px solid #E8E8E8;border-radius:6px;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${infoRows
        .map(
          ([label, value]) => `
      <tr>
        <td style="padding:8px 14px;font-family:${FONT};font-size:13px;font-weight:600;color:#6B7280;width:110px;vertical-align:top;white-space:nowrap;">${esc(label)}</td>
        <td style="padding:8px 14px;font-family:${FONT};font-size:13px;color:#374151;vertical-align:top;">${esc(value)}</td>
      </tr>`
        )
        .join("")}
    </table>
  </div>`;

  const content = `
    <div style="margin-bottom:20px;">
      <span style="display:inline-block;background-color:#FEE2E2;color:#DC2626;font-family:${FONT};font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;">Rejected</span>
    </div>
    <p style="margin:0 0 16px;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">Your ${esc(itemType)} was not approved. The reviewer left the following reason:</p>
    <div style="padding:16px 18px;border-left:4px solid #DC2626;background-color:#FEF2F2;border-radius:0 6px 6px 0;margin:0 0 4px;">
      <p style="margin:0;font-family:${FONT};font-size:14px;color:#7F1D1D;line-height:1.6;">${esc(reason)}</p>
    </div>
    ${infoBlock}`;

  const html = emailShell({
    itemTitle,
    pathLabel,
    content,
    itemUrl,
    footerReason: `You received this because you created this ${itemType} in task4all.`,
  });

  const descText = description ? `\nDescription: ${description}` : "";
  const text = `task4all — Rejected\n\n${itemTitle}${pathLabel ? "\n" + pathLabel : ""}\n\nYour ${itemType} was rejected.\n\nReason: ${reason}\n\nDue: ${dueDate}${descText}\n\nView: ${itemUrl}`;

  return { html, text };
}
