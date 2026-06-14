import { ImageResponse } from "next/og";

export const alt = "URDF Viewer Online — inspect ROS robot models in your browser";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0f1115 0%, #1d2330 60%, #25406b 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 2,
            color: "#7aa5ff",
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          ROS · URDF · xacro
        </div>
        <div
          style={{
            fontSize: 88,
            lineHeight: 1.05,
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          URDF Viewer Online
        </div>
        <div style={{ fontSize: 34, color: "#c8d2e0", maxWidth: 1000 }}>
          Drag-and-drop a ROS package zip. Inspect the robot in 3D and drive
          every joint in your browser. No install, no upload.
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            fontSize: 22,
            color: "#9aa6b8",
          }}
        >
          <span>Next.js</span>
          <span>·</span>
          <span>three.js</span>
          <span>·</span>
          <span>urdf-loader</span>
          <span>·</span>
          <span>xacro</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
