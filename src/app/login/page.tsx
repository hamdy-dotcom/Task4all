"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setAuthError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setAuthError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--color-canvas)" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center" style={{ gap: 28 }}>
        {/* Logo — above the card */}
        <img
          src="/brand/logo.png"
          alt="task4all"
          style={{ width: 180, height: "auto", display: "block" }}
        />

        {/* Card */}
        <div
          className="w-full"
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-card)",
            padding: "40px 32px",
          }}
        >
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink-700)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@nmlonline.sa"
              {...register("email")}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: "var(--radius-input)",
                border: errors.email
                  ? "1px solid var(--color-crit)"
                  : "1px solid var(--color-ink-200)",
                background: "var(--color-surface-inner)",
                fontSize: 15,
                color: "var(--color-ink-900)",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                transition: "border-color 150ms cubic-bezier(.4,0,.2,1)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = "var(--color-surface)";
                e.currentTarget.style.boxShadow = "var(--shadow-raised)";
                if (!errors.email) e.currentTarget.style.borderColor = "var(--color-ink-400)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = "var(--color-surface-inner)";
                e.currentTarget.style.boxShadow = "none";
                if (!errors.email) e.currentTarget.style.borderColor = "var(--color-ink-200)";
              }}
            />
            {errors.email && (
              <p style={{ fontSize: 13, color: "var(--color-crit)" }}>{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              style={{ fontSize: 13, fontWeight: 500, color: "var(--color-ink-700)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                style={{
                  height: 44,
                  paddingBlock: 0,
                  paddingInlineStart: 16,
                  paddingInlineEnd: 44,
                  borderRadius: "var(--radius-input)",
                  border: errors.password
                    ? "1px solid var(--color-crit)"
                    : "1px solid var(--color-ink-200)",
                  background: "var(--color-surface-inner)",
                  fontSize: 15,
                  color: "var(--color-ink-900)",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                  transition: "border-color 150ms cubic-bezier(.4,0,.2,1)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = "var(--color-surface)";
                  e.currentTarget.style.boxShadow = "var(--shadow-raised)";
                  if (!errors.password) e.currentTarget.style.borderColor = "var(--color-ink-400)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = "var(--color-surface-inner)";
                  e.currentTarget.style.boxShadow = "none";
                  if (!errors.password) e.currentTarget.style.borderColor = "var(--color-ink-200)";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 flex items-center"
                style={{ insetInlineEnd: 14 }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={18} color="var(--color-ink-400)" />
                ) : (
                  <Eye size={18} color="var(--color-ink-400)" />
                )}
              </button>
            </div>
            {errors.password && (
              <p style={{ fontSize: 13, color: "var(--color-crit)" }}>{errors.password.message}</p>
            )}
          </div>

          {/* Auth error banner */}
          {authError && (
            <div
              className="flex items-center gap-2"
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-row)",
                background: "var(--color-crit-soft)",
                fontSize: 14,
                color: "var(--color-crit)",
              }}
            >
              {authError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 font-semibold"
            style={{
              height: 44,
              borderRadius: "999px",
              background: isSubmitting ? "var(--color-nml-hover)" : "var(--color-nml)",
              color: "#fff",
              fontSize: 14,
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "background 150ms cubic-bezier(.4,0,.2,1)",
              width: "100%",
              marginTop: 4,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting)
                e.currentTarget.style.background = "var(--color-nml-hover)";
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting)
                e.currentTarget.style.background = "var(--color-nml)";
            }}
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        </div> {/* /card */}
      </div> {/* /wrapper */}
    </div>
  );
}
