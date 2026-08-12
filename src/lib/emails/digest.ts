import { esc } from "./shell";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const BRAND = "#10B981";

export interface DigestItem {
  id: string;
  title: string;
  type: string;
  creatorName: string;
  createdAt: string; // ISO string
}

interface Opts {
  pendingItems: DigestItem[];
  appUrl: string;
  todayLabel: string; // e.g. "Sunday, 10 August 2026"
}

function waitingLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function digestEmail(opts: Opts): { html: string; text: string } {
  const { pendingItems, appUrl, todayLabel } = opts;

  const n = pendingItems.length;
  const shown = pendingItems.slice(0, 3);
  const more = n - shown.length;

  const rows = shown
    .map(
      (item) => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #F0F0F0;font-family:${FONT};">
        <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#1A1A1A;">${esc(item.title)}</p>
        <p style="margin:0;font-size:12px;color:#9CA3AF;">
          ${esc(item.type.charAt(0).toUpperCase() + item.type.slice(1))}
          &nbsp;&middot;&nbsp;by ${esc(item.creatorName)}
          &nbsp;&middot;&nbsp;waiting ${esc(waitingLabel(item.createdAt))}
        </p>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #F0F0F0;text-align:right;white-space:nowrap;font-family:${FONT};">
        <a href="${appUrl}/approvals" style="display:inline-block;background-color:${BRAND};color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;padding:6px 16px;border-radius:999px;">Review</a>
      </td>
    </tr>`
    )
    .join("");

  const moreRow =
    more > 0
      ? `<tr><td colspan="2" style="padding:12px 16px;font-family:${FONT};font-size:13px;color:#6B7280;">
          and <strong>${more}</strong> more &mdash; <a href="${appUrl}/approvals" style="color:${BRAND};text-decoration:none;">see all</a>
        </td></tr>`
      : "";

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F4F4;padding:32px 0;">
<tr><td align="center" style="padding:0 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="background-color:${BRAND};padding:20px 28px;border-radius:8px 8px 0 0;">
    <span style="font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;letter-spacing:.06em;">task4all</span>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:28px 28px 8px;border-left:1px solid #E8E8E8;border-right:1px solid #E8E8E8;">
    <h2 style="margin:0 0 4px;font-family:${FONT};font-size:20px;font-weight:700;color:#1A1A1A;">${n} item${n !== 1 ? "s" : ""} waiting for your review</h2>
    <p style="margin:0 0 24px;font-family:${FONT};font-size:13px;color:#999999;">${esc(todayLabel)}</p>
    <div style="border:1px solid #E8E8E8;border-radius:6px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
        ${moreRow}
      </table>
    </div>
    <div style="margin:28px 0 24px;">
      <a href="${appUrl}/approvals" style="display:inline-block;background-color:${BRAND};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:999px;">Open approvals queue &rarr;</a>
    </div>
  </td></tr>
  <tr><td style="background-color:#FAFAFA;padding:16px 28px;border:1px solid #E8E8E8;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0;font-family:${FONT};font-size:12px;color:#999999;line-height:1.5;">You received this daily digest because you are a super admin in task4all.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const itemLines = shown
    .map(
      (item) =>
        `- ${item.title} (${item.type}, by ${item.creatorName}, waiting ${waitingLabel(item.createdAt)})`
    )
    .join("\n");
  const moreText = more > 0 ? `\n...and ${more} more` : "";

  const text = `task4all — Daily digest\n\n${n} item${n !== 1 ? "s" : ""} waiting for your review — ${todayLabel}\n\n${itemLines}${moreText}\n\nOpen approvals: ${appUrl}/approvals`;

  return { html, text };
}
