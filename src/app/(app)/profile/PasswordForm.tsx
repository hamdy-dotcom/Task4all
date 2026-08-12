"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePassword } from "./actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 14,
  border: "1px solid var(--color-ink-200)",
  background: "var(--color-surface-inner)",
  padding: "0 14px",
  fontSize: 14,
  color: "var(--color-ink-900)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-ink-600)",
  marginBottom: 6,
};

export function PasswordForm() {
  const t = useTranslations("profile");
  const [state, action, pending] = useActionState(changePassword, {});

  if (state.success) {
    return (
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--color-ok-soft)",
          fontSize: 14,
          color: "var(--color-ok)",
          fontWeight: 500,
        }}
      >
        {t("passwordSuccess")}
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label htmlFor="current_password" style={labelStyle}>{t("currentPassword")}</label>
        <input id="current_password" name="current_password" type="password" required style={inputStyle} autoComplete="current-password" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="new_password" style={labelStyle}>{t("newPassword")}</label>
          <input id="new_password" name="new_password" type="password" required minLength={8} style={inputStyle} autoComplete="new-password" />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label htmlFor="confirm_password" style={labelStyle}>{t("confirmPassword")}</label>
          <input id="confirm_password" name="confirm_password" type="password" required minLength={8} style={inputStyle} autoComplete="new-password" />
        </div>
      </div>

      {state.error && (
        <p
          style={{
            margin: 0,
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--color-crit-soft)",
            fontSize: 13,
            color: "var(--color-crit)",
            fontWeight: 500,
          }}
        >
          {state.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn-nml"
          style={{
            height: 44,
            borderRadius: 999,
            border: "none",
            padding: "0 24px",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? t("passwordUpdating") : t("passwordUpdate")}
        </button>
      </div>
    </form>
  );
}
