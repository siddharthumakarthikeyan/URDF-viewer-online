"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { URDFJoint, URDFRobot } from "urdf-loader";

import { ZipFS, type UrdfEntry } from "@/lib/zipFs";
import { processXacro } from "@/lib/xacroProcess";
import { loadUrdfFromVfs } from "@/lib/urdfLoad";
import JointPanel from "./JointPanel";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export default function Viewer() {
  // ---- scene refs ----------------------------------------------------------
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const robotAxesRef = useRef<THREE.AxesHelper | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const robotRef = useRef<URDFRobot | null>(null);

  // ---- react state ---------------------------------------------------------
  const [vfs, setVfs] = useState<ZipFS | null>(null);
  const [entries, setEntries] = useState<UrdfEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<string>("");
  const [robot, setRobot] = useState<URDFRobot | null>(null);
  const [jointNames, setJointNames] = useState<string[]>([]);
  const [jointValues, setJointValues] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);

  // ---- three.js scene setup ------------------------------------------------
  useEffect(() => {
    const host = canvasHostRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);

    const camera = new THREE.PerspectiveCamera(
      50,
      host.clientWidth / Math.max(host.clientHeight, 1),
      0.01,
      100,
    );
    camera.position.set(1.2, 1.0, 1.4);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0.1);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444466, 0.8);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2, 3, 4);
    dir.castShadow = true;
    scene.add(dir);

    const grid = new THREE.GridHelper(8, 40, 0x445566, 0x223344);
    grid.rotation.x = Math.PI / 2; // Z-up
    scene.add(grid);

    const axes = new THREE.AxesHelper(0.25);
    scene.add(axes);

    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    robotGroupRef.current = robotGroup;

    let needsRender = true;
    requestRenderRef.current = () => {
      needsRender = true;
    };

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const changed = controls.update();
      if (changed || needsRender) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    };
    animate();

    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      requestRenderRef.current();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  // ---- load pipeline -------------------------------------------------------
  const loadFromZip = useCallback(async (file: File) => {
    setStatus({ kind: "loading", message: "Reading zip..." });
    try {
      const newFs = await ZipFS.fromZip(file);
      if (newFs.urdfs.length === 0) {
        throw new Error("No .urdf or .xacro files found in the zip.");
      }
      setVfs((prev) => {
        prev?.dispose();
        return newFs;
      });
      setEntries(newFs.urdfs);
      setSelectedEntry(newFs.urdfs[0].path);
    } catch (err) {
      console.error(err);
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Reload robot whenever the selected URDF entry changes
  useEffect(() => {
    if (!vfs || !selectedEntry) return;
    let cancelled = false;
    (async () => {
      setStatus({ kind: "loading", message: "Processing URDF..." });
      try {
        const entry = vfs.urdfs.find((e) => e.path === selectedEntry);
        if (!entry) throw new Error("Selected entry not in VFS");
        const urdfXml = await processXacro(vfs, entry.path);
        if (cancelled) return;

        const group = robotGroupRef.current!;
        while (group.children.length) group.remove(group.children[0]);

        const newRobot = loadUrdfFromVfs(urdfXml, vfs, () => {
          requestRenderRef.current();
          frameRobot();
          fitRobotAxes();
        });
        group.add(newRobot);

        // Robot-attached X/Y/Z gizmo (red/green/blue) so the body frame is
        // always visible — user can spot mirrored / flipped joints visually.
        const robotAxes = new THREE.AxesHelper(0.2);
        (robotAxes.material as THREE.LineBasicMaterial).depthTest = false;
        robotAxes.renderOrder = 998;
        newRobot.add(robotAxes);
        robotAxesRef.current = robotAxes;

        robotRef.current = newRobot;
        setRobot(newRobot);

        const names: string[] = [];
        const vals: Record<string, number> = {};
        for (const [name, joint] of Object.entries(newRobot.joints) as [
          string,
          URDFJoint,
        ][]) {
          if (joint.jointType === "fixed") continue;
          names.push(name);
          const cur = Array.isArray(joint.angle)
            ? joint.angle[0]
            : (joint.angle as number);
          vals[name] = Number(cur ?? 0);
        }
        setJointNames(names);
        setJointValues(vals);

        frameRobot();
        setStatus({ kind: "ready" });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vfs, selectedEntry]);

  // ---- helpers -------------------------------------------------------------
  const frameRobot = useCallback(() => {
    const group = robotGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!group || !camera || !controls) return;
    const box = new THREE.Box3().setFromObject(group);
    if (!isFinite(box.min.x) || box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
    const dist = (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.6;
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    camera.position.copy(center).addScaledVector(dir, dist);
    controls.target.copy(center);
    camera.near = Math.max(dist / 1000, 0.001);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    controls.update();
    requestRenderRef.current();
  }, []);

  /** Scale the robot-attached axis gizmo to ~35% of the robot's longest side. */
  const fitRobotAxes = useCallback(() => {
    const r = robotRef.current;
    const axes = robotAxesRef.current;
    if (!r || !axes) return;
    const box = new THREE.Box3().setFromObject(r);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const target = Math.max(size.x, size.y, size.z) * 0.35 || 0.2;
    axes.scale.setScalar(target);
  }, []);

  // ---- joint controls -----------------------------------------------------
  const setJoint = useCallback(
    (name: string, value: number) => {
      if (!robot) return;
      robot.setJointValue(name, value);
      setJointValues((prev) => ({ ...prev, [name]: value }));
      requestRenderRef.current();
    },
    [robot],
  );

  const resetJoints = useCallback(() => {
    if (!robot) return;
    const next: Record<string, number> = {};
    for (const name of jointNames) {
      robot.setJointValue(name, 0);
      next[name] = 0;
    }
    setJointValues(next);
    requestRenderRef.current();
  }, [robot, jointNames]);

  // ---- drag & drop ---------------------------------------------------------
  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = Array.from(files).find((f) =>
        f.name.toLowerCase().endsWith(".zip"),
      );
      if (!file) {
        setStatus({ kind: "error", message: "Please drop a .zip file." });
        return;
      }
      loadFromZip(file);
    },
    [loadFromZip],
  );

  const isLoading = status.kind === "loading";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 340px",
        gridTemplateRows: "auto 1fr",
        height: "100vh",
        gap: 0,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer?.files ?? null);
      }}
    >
      <Header
        entries={entries}
        selected={selectedEntry}
        onSelect={setSelectedEntry}
        onFile={onFiles}
        onReset={resetJoints}
        canReset={jointNames.length > 0}
        status={status}
      />

      <div
        ref={canvasHostRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: "#0f1115",
          gridColumn: "1 / 2",
        }}
      >
        {(isLoading || dragOver || entries.length === 0) && (
          <Overlay
            dragOver={dragOver}
            loading={isLoading ? status.message : null}
            empty={entries.length === 0}
          />
        )}

        {robot && <AxesLegend />}
      </div>

      <aside
        style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--panel)",
          overflowY: "auto",
          padding: 12,
        }}
      >
        <JointPanel
          joints={jointNames}
          values={jointValues}
          robot={robot}
          onChange={setJoint}
        />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Header(props: {
  entries: UrdfEntry[];
  selected: string;
  onSelect: (path: string) => void;
  onFile: (files: FileList | null) => void;
  onReset: () => void;
  canReset: boolean;
  status: Status;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  return (
    <div
      style={{
        gridColumn: "1 / 3",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--panel)",
      }}
    >
      <strong style={{ marginRight: 8 }}>URDF Viewer</strong>

      <button onClick={() => fileInput.current?.click()}>Open zip…</button>
      <input
        ref={fileInput}
        type="file"
        accept=".zip,application/zip"
        style={{ display: "none" }}
        onChange={(e) => props.onFile(e.target.files)}
      />
      {props.entries.length > 0 && (
        <select
          value={props.selected}
          onChange={(e) => props.onSelect(e.target.value)}
          style={{
            background: "var(--panel-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "5px 8px",
            maxWidth: 380,
          }}
        >
          {props.entries.map((e) => (
            <option key={e.path} value={e.path}>
              {e.path} {e.pkg ? `(${e.pkg})` : ""}
            </option>
          ))}
        </select>
      )}
      <button onClick={props.onReset} disabled={!props.canReset}>
        Reset joints
      </button>
      <div style={{ marginLeft: "auto", color: "var(--muted)" }}>
        {props.status.kind === "loading" && <span>{props.status.message}</span>}
        {props.status.kind === "error" && (
          <span style={{ color: "var(--danger)" }}>{props.status.message}</span>
        )}
        {props.status.kind === "ready" && <span>Ready</span>}
      </div>
    </div>
  );
}

function Overlay(props: {
  dragOver: boolean;
  loading: string | null;
  empty: boolean;
}) {
  const visible = props.dragOver || props.loading || props.empty;
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: props.dragOver
          ? "rgba(79,140,255,0.18)"
          : "rgba(15,17,21,0.65)",
        border: props.dragOver ? "2px dashed var(--accent)" : "none",
        pointerEvents: props.loading ? "auto" : "none",
        zIndex: 5,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {props.loading ? (
          <div style={{ fontSize: 16 }}>{props.loading}</div>
        ) : (
          <>
            <div style={{ fontSize: 18, marginBottom: 6 }}>
              Drop a ROS package <code>.zip</code> here
            </div>
            <div style={{ color: "var(--muted)" }}>
              We process <code>.xacro</code> &amp; <code>.urdf</code> in your
              browser — nothing is uploaded.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AxesLegend() {
  const row = (color: string, label: string) => (
    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 14,
          height: 3,
          background: color,
          display: "inline-block",
          borderRadius: 1,
        }}
      />
      <span>{label}</span>
    </div>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 5,
        padding: "8px 10px",
        background: "rgba(29,35,48,0.85)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        fontSize: 11,
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div style={{ color: "var(--muted)", marginBottom: 2 }}>Robot axes</div>
      {row("#ff5555", "X")}
      {row("#55dd55", "Y")}
      {row("#5588ff", "Z")}
    </div>
  );
}
