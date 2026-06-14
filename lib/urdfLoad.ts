import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import URDFLoader, { URDFRobot } from "urdf-loader";
import type { ZipFS } from "./zipFs";

const DEFAULT_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xbfc4cf,
  metalness: 0.15,
  roughness: 0.55,
});

/**
 * Parse a URDF string with mesh references resolved against the given VFS.
 * Returns a URDFRobot once the document is parsed; mesh loads continue
 * asynchronously and call `onMeshLoaded` when each mesh resolves so the host
 * can trigger a re-render.
 */
export function loadUrdfFromVfs(
  urdfXml: string,
  vfs: ZipFS,
  onMeshLoaded?: () => void,
): URDFRobot {
  const manager = new THREE.LoadingManager();
  const loader = new URDFLoader(manager);

  loader.packages = (pkgName: string) => `vfs://${pkgName}`;
  loader.workingPath = "";
  loader.parseVisual = true;
  loader.parseCollision = false;

  loader.loadMeshCb = (path, _mgr, done) => {
    try {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const resolved = vfs.resolve(path);
      if (!resolved) {
        done(null as any, new Error(`Mesh not found in zip: ${path}`));
        return;
      }
      const url = vfs.blobUrl(resolved, mimeFor(ext))!;

      const finish = (obj: THREE.Object3D) => {
        applyDefaultMaterial(obj);
        done(obj);
        onMeshLoaded?.();
      };
      const fail = (err: unknown) =>
        done(null as any, err instanceof Error ? err : new Error(String(err)));

      switch (ext) {
        case "stl": {
          new STLLoader().load(
            url,
            (geom) => finish(new THREE.Mesh(geom, DEFAULT_MATERIAL.clone())),
            undefined,
            fail,
          );
          break;
        }
        case "dae": {
          new ColladaLoader().load(
            url,
            (collada) => finish(collada.scene),
            undefined,
            fail,
          );
          break;
        }
        case "obj": {
          new OBJLoader().load(url, (obj) => finish(obj), undefined, fail);
          break;
        }
        case "gltf":
        case "glb": {
          new GLTFLoader().load(
            url,
            (gltf) => finish(gltf.scene),
            undefined,
            fail,
          );
          break;
        }
        default: {
          fail(new Error(`Unsupported mesh format: .${ext}`));
        }
      }
    } catch (err) {
      done(null as any, err instanceof Error ? err : new Error(String(err)));
    }
  };

  const robot = loader.parse(urdfXml);
  return robot;
}

function applyDefaultMaterial(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !mesh.material) {
      mesh.material = DEFAULT_MATERIAL.clone();
    }
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

function mimeFor(ext: string): string {
  switch (ext) {
    case "stl":
      return "model/stl";
    case "dae":
      return "model/vnd.collada+xml";
    case "obj":
      return "text/plain";
    case "gltf":
      return "model/gltf+json";
    case "glb":
      return "model/gltf-binary";
    default:
      return "application/octet-stream";
  }
}
