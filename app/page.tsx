import type { Metadata } from "next";
import ViewerLoader from "@/components/ViewerLoader";

export const metadata: Metadata = {
  title: "URDF Viewer Online — Free In-Browser ROS URDF & xacro Viewer",
  description:
    "View ROS URDF and xacro robot models online. Drag-and-drop a ROS package zip and inspect the robot in 3D with real-time joint sliders. Runs entirely in your browser — no install, no upload.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return (
    <>
      {/* Visually-hidden but crawlable SEO content. Bots and screen readers
          see real text; sighted users see the full-screen 3D viewer. */}
      <h1 style={srOnlyStyle}>
        URDF Viewer Online — view ROS URDF and xacro robot models in your
        browser
      </h1>
      <div style={srOnlyStyle}>
        <p>
          URDF Viewer Online is a free, in-browser viewer for ROS robot
          descriptions. Drop a zipped ROS package onto the page and the viewer
          will discover its <code>package.xml</code>, run <code>xacro</code>{" "}
          client-side, load the URDF, and render the robot in interactive 3D.
          Move every revolute, continuous, or prismatic joint with a slider.
          Nothing is uploaded — all parsing and rendering happens in your
          browser using WebGL.
        </p>
        <h2>Features</h2>
        <ul>
          <li>Open URDF and xacro files online</li>
          <li>Drag-and-drop a ROS or ROS 2 package zip</li>
          <li>Per-joint sliders with URDF limits enforced</li>
          <li>STL, DAE, OBJ, GLTF, and GLB mesh support</li>
          <li>
            Resolves <code>package://</code>, <code>$(find pkg)</code>,
            relative, and absolute mesh references
          </li>
          <li>Robot-attached X / Y / Z axis gizmo to spot mirrored joints</li>
          <li>Fully client-side, no install, free, and open source</li>
        </ul>
        <h2>Frequently asked questions</h2>
        <h3>What is a URDF viewer?</h3>
        <p>
          A URDF viewer renders the 3D model of a ROS robot from its URDF or
          xacro description so you can inspect links, joints, and meshes.
        </p>
        <h3>Do I need to install ROS, Gazebo, or RViz?</h3>
        <p>
          No. URDF Viewer Online is a static web app, so you can view ROS
          robots without any local toolchain.
        </p>
        <h3>Are my files uploaded?</h3>
        <p>
          No. The zip is read and rendered entirely in your browser. Nothing
          leaves your machine.
        </p>
      </div>

      <ViewerLoader />
    </>
  );
}

const srOnlyStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
