import { emailShell, esc } from "./shell";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

interface Opts {
  recipientRole: "creator" | "assignee";
  itemTitle: string;
  itemType: string;
  pathLabel: string;
  markedByName: string;
  parentTitle: string;
  parentProgress: number;
  itemUrl: string;
}

export function doneEmail(opts: Opts): { html: string; text: string } {
  const {
    recipientRole,
    itemTitle,
    itemType,
    pathLabel,
    markedByName,
    parentTitle,
    parentProgress,
    itemUrl,
  } = opts;

  const pct = Math.round(parentProgress);
  const progressBar = parentTitle
    ? `
    <div style="margin:20px 0;">
      <p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#6B7280;">
        <strong style="color:#374151;">${esc(parentTitle)}</strong> &mdash; ${pct}% complete
      </p>
      <div style="height:8px;background-color:#E5E7EB;border-radius:999px;overflow:hidden;">
        <div style="height:8px;width:${pct}%;background-color:#15803D;border-radius:999px;"></div>
      </div>
    </div>`
    : "";

  const leadLine =
    recipientRole === "creator"
      ? `<strong>${esc(markedByName)}</strong> marked your ${esc(itemType)} as done.`
      : `<strong>${esc(markedByName)}</strong> marked this ${esc(itemType)} as done.`;

  const content = `
    <div style="margin-bottom:20px;">
      <span style="display:inline-block;background-color:#DCFCE7;color:#15803D;font-family:${FONT};font-size:11px;font-weight:700;padding:4px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;">Done</span>
    </div>
    <p style="margin:0 0 16px;font-family:${FONT};font-size:15px;color:#374151;line-height:1.5;">${leadLine}</p>
    ${progressBar}`;

  const footerReason =
    recipientRole === "creator"
      ? `You received this because you created this ${itemType} in task4all.`
      : `You received this because you are assigned to this ${itemType} in task4all.`;

  const html = emailShell({ itemTitle, pathLabel, content, itemUrl, footerReason });

  const progressText = parentTitle ? `\n\n${parentTitle}: ${pct}% complete` : "";
  const leadText =
    recipientRole === "creator"
      ? `${markedByName} marked your ${itemType} as done.`
      : `${markedByName} marked this ${itemType} as done.`;

  const text = `task4all — Done\n\n${itemTitle}${pathLabel ? "\n" + pathLabel : ""}\n\n${leadText}${progressText}\n\nView: ${itemUrl}`;

  return { html, text };
}
