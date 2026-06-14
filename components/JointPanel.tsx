"use client";

import type { URDFJoint, URDFRobot } from "urdf-loader";

export default function JointPanel(props: {
  joints: string[];
  values: Record<string, number>;
  robot: URDFRobot | null;
  onChange: (name: string, value: number) => void;
}) {
  return (
    <>
      <h3 style={{ margin: "4px 0 12px" }}>Joints</h3>
      {props.joints.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          Load a package to see movable joints.
        </p>
      )}
      {props.joints.map((name) => {
        const joint = props.robot?.joints[name];
        if (!joint) return null;
        const { lower, upper } = limitsFor(joint);
        const value = props.values[name] ?? 0;
        return (
          <div
            key={name}
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              background: "var(--panel-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
                gap: 8,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={name}
              >
                {name}
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                {joint.jointType}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="range"
                min={lower}
                max={upper}
                step={(upper - lower) / 500 || 0.001}
                value={value}
                onChange={(e) =>
                  props.onChange(name, parseFloat(e.target.value))
                }
              />
              <input
                type="number"
                value={Number.isFinite(value) ? +value.toFixed(4) : 0}
                step={(upper - lower) / 200 || 0.001}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) props.onChange(name, v);
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--muted)",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              <span>{lower.toFixed(3)}</span>
              <span>{upper.toFixed(3)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function limitsFor(joint: URDFJoint): { lower: number; upper: number } {
  const lo = Number(joint.limit?.lower);
  const hi = Number(joint.limit?.upper);
  if (
    joint.jointType === "continuous" ||
    !Number.isFinite(lo) ||
    !Number.isFinite(hi) ||
    lo === hi
  ) {
    if (joint.jointType === "prismatic") return { lower: -1, upper: 1 };
    return { lower: -Math.PI, upper: Math.PI };
  }
  return { lower: lo, upper: hi };
}
