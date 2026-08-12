// Shared email shell — table-based, inline CSS only, no external resources.

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface ShellOpts {
  itemTitle: string;
  pathLabel: string;
  content: string; // inner HTML, already escaped
  itemUrl: string;
  footerReason: string;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function emailShell({
  itemTitle,
  pathLabel,
  content,
  itemUrl,
  footerReason,
}: ShellOpts): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F4F4;padding:32px 0;">
<tr><td align="center" style="padding:0 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
  <tr><td style="background-color:#10B981;padding:20px 28px;border-radius:8px 8px 0 0;">
    <span style="font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;letter-spacing:.06em;">task4all</span>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:32px 28px 8px;border-left:1px solid #E8E8E8;border-right:1px solid #E8E8E8;">
    <h2 style="margin:0 0 6px;font-family:${FONT};font-size:20px;font-weight:700;color:#1A1A1A;line-height:1.3;">${esc(itemTitle)}</h2>
    ${
      pathLabel
        ? `<p style="margin:0 0 24px;font-family:${FONT};font-size:13px;color:#999999;">${esc(pathLabel)}</p>`
        : `<div style="margin-bottom:24px;"></div>`
    }
    ${content}
    <div style="margin:28px 0 24px;">
      <a href="${itemUrl}" style="display:inline-block;background-color:#10B981;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:999px;">View in task4all &rarr;</a>
    </div>
  </td></tr>
  <tr><td style="background-color:#FAFAFA;padding:16px 28px;border:1px solid #E8E8E8;border-top:none;border-radius:0 0 8px 8px;">
    <p style="margin:0;font-family:${FONT};font-size:12px;color:#999999;line-height:1.5;">${esc(footerReason)}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
