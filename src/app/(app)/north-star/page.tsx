import { Star, ShieldCheck, GitBranch } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function NorthStarPage() {
  const t = await getTranslations("northStar");

  const whyItems = [
    { title: t("why1Title"), body: t("why1Body") },
    { title: t("why2Title"), body: t("why2Body") },
    { title: t("why3Title"), body: t("why3Body") },
    { title: t("why4Title"), body: t("why4Body") },
  ];

  const branches = [
    {
      name: t("branch1Name"),
      metrics: [t("branch1m1"), t("branch1m2"), t("branch1m3"), t("branch1m4")],
    },
    {
      name: t("branch2Name"),
      metrics: [t("branch2m1"), t("branch2m2"), t("branch2m3"), t("branch2m4")],
    },
    {
      name: t("branch3Name"),
      metrics: [t("branch3m1"), t("branch3m2"), t("branch3m3"), t("branch3m4")],
    },
    {
      name: t("branch4Name"),
      metrics: [t("branch4m1"), t("branch4m2"), t("branch4m3"), t("branch4m4")],
    },
  ];

  const alternatives = [
    { name: t("alt1Name"), why: t("alt1Why") },
    { name: t("alt2Name"), why: t("alt2Why") },
    { name: t("alt3Name"), why: t("alt3Why") },
    { name: t("alt4Name"), why: t("alt4Why") },
  ];

  const rhythmRows = [
    { cadence: t("rhythm1Cadence"), who: t("rhythm1Who"), output: t("rhythm1Output") },
    { cadence: t("rhythm2Cadence"), who: t("rhythm2Who"), output: t("rhythm2Output") },
    { cadence: t("rhythm3Cadence"), who: t("rhythm3Who"), output: t("rhythm3Output") },
    { cadence: t("rhythm4Cadence"), who: t("rhythm4Who"), output: t("rhythm4Output") },
  ];

  return (
    <div style={{ maxWidth: 900, marginInline: "auto" }}>
      {/* Hero */}
      <div
        style={{
          padding: "36px 40px",
          borderRadius: "var(--radius-inner)",
          background: "var(--color-nml)",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            insetInlineEnd: -20,
            top: -20,
            width: 160,
            height: 160,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          className="flex items-center"
          style={{ gap: 12, marginBottom: 16 }}
        >
          <Star size={24} color="rgba(255,255,255,0.85)" strokeWidth={1.5} />
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {t("metric")}
          </p>
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            lineHeight: "38px",
            color: "#fff",
            marginBottom: 8,
          }}
        >
          {t("metricName")}
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: "24px",
            color: "rgba(255,255,255,0.75)",
            maxWidth: 560,
          }}
        >
          {t("metricDefinition")}
        </p>
      </div>

      {/* Guardrail */}
      <div
        style={{
          padding: 24,
          borderRadius: "var(--radius-inner)",
          background: "var(--color-surface-inner)",
          border: "1px solid var(--color-ink-200)",
          marginBottom: 32,
        }}
      >
        <div
          className="flex items-center"
          style={{ gap: 10, marginBottom: 12 }}
        >
          <ShieldCheck
            size={20}
            color="var(--color-ink-600)"
            strokeWidth={1.5}
          />
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink-900)",
            }}
          >
            {t("guardrail")}
          </h2>
        </div>
        <p
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBottom: 6,
          }}
        >
          {t("guardrailName")}
        </p>
        <p
          style={{
            fontSize: 14,
            lineHeight: "21px",
            color: "var(--color-ink-600)",
          }}
        >
          {t.rich("guardrailBody", {
            em: (chunks) => <em>{chunks}</em>,
          })}
        </p>
      </div>

      {/* Why this number */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBottom: 16,
          }}
        >
          {t("whyThisNumber")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {whyItems.map(({ title, body }) => (
            <div
              key={title}
              style={{
                padding: "14px 20px",
                borderRadius: "var(--radius-row)",
                background: "var(--color-surface-inner)",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  lineHeight: "21px",
                  color: "var(--color-ink-700)",
                }}
              >
                <strong style={{ color: "var(--color-ink-900)" }}>
                  {title}
                </strong>{" "}
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Metric tree */}
      <div style={{ marginBottom: 32 }}>
        <div
          className="flex items-center"
          style={{ gap: 10, marginBottom: 6 }}
        >
          <GitBranch size={20} color="var(--color-ink-600)" strokeWidth={1.5} />
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink-900)",
            }}
          >
            {t("metricTree")}
          </h2>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-ink-500)",
            marginBottom: 20,
          }}
        >
          {t("treeOnly")}
        </p>

        <div
          style={{
            padding: "16px 24px",
            borderRadius: "var(--radius-inner)",
            background: "var(--color-nml)",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
            {t("metricName")}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          {branches.map(({ name, metrics }) => (
            <div
              key={name}
              style={{
                padding: "16px 20px",
                borderRadius: "var(--radius-inner)",
                background: "var(--color-surface-inner)",
                border: "1px solid var(--color-ink-200)",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-ink-900)",
                  marginBottom: 12,
                }}
              >
                {name}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {metrics.map((m) => (
                  <li
                    key={m}
                    style={{
                      fontSize: 13,
                      lineHeight: "18px",
                      color: "var(--color-ink-600)",
                      paddingInlineStart: 12,
                      borderInlineStart: "2px solid var(--color-ink-300)",
                    }}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Alternatives rejected */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBottom: 16,
          }}
        >
          {t("rejected")}
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            <thead>
              <tr>
                {[t("metricHeader"), t("whyNotHeader")].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "start",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--color-ink-500)",
                      borderBottom: "1px solid var(--color-ink-200)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alternatives.map(({ name, why }) => (
                <tr key={name}>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 600,
                      color: "var(--color-ink-900)",
                      borderBottom: "1px solid var(--color-ink-100)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {name}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-ink-600)",
                      borderBottom: "1px solid var(--color-ink-100)",
                    }}
                  >
                    {why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review rhythm */}
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBottom: 16,
          }}
        >
          {t("reviewRhythm")}
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
              lineHeight: "20px",
            }}
          >
            <thead>
              <tr>
                {[t("cadenceHeader"), t("whoHeader"), t("outputHeader")].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "start",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--color-ink-500)",
                      borderBottom: "1px solid var(--color-ink-200)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rhythmRows.map(({ cadence, who, output }) => (
                <tr key={cadence}>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontWeight: 600,
                      color: "var(--color-ink-900)",
                      borderBottom: "1px solid var(--color-ink-100)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cadence}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-ink-700)",
                      borderBottom: "1px solid var(--color-ink-100)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {who}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-ink-600)",
                      borderBottom: "1px solid var(--color-ink-100)",
                    }}
                  >
                    {output}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standing rule */}
      <div
        style={{
          padding: 24,
          borderRadius: "var(--radius-inner)",
          background: "var(--color-surface-inner)",
          border: "1px solid var(--color-ink-200)",
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--color-ink-900)",
            marginBottom: 8,
          }}
        >
          {t("standingRule")}
        </p>
        <p
          style={{
            fontSize: 14,
            lineHeight: "21px",
            color: "var(--color-ink-600)",
          }}
        >
          {t.rich("standingRuleBody", {
            strong: (chunks) => (
              <strong style={{ color: "var(--color-ink-900)" }}>{chunks}</strong>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
