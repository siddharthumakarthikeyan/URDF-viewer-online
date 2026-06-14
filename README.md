# URDF Viewer Online

**Free online URDF viewer for ROS robots.** Drag-and-drop a zipped ROS package
into your browser and inspect the URDF or xacro robot model in interactive 3D,
with a slider for every non-fixed joint. No install, no upload — everything
runs client-side using WebGL.

> Keywords: URDF viewer, online URDF viewer, xacro viewer, ROS URDF, ROS 2
> URDF, browser URDF viewer, view URDF online, URDF visualization, robot
> model viewer, 3D URDF viewer, RViz alternative.

Live: https://urdf-viewer-online.vercel.app/


## Highlights

- Accepts a `.zip` of a ROS package, or an entire workspace containing many
  packages. `package.xml` is auto-discovered, so `package://my_pkg/...` and
  `$(find my_pkg)` references resolve exactly like they do under ROS.
- Processes `xacro` files directly in the browser. Plain `.urdf` files also
  work.
- Loads visual meshes in `.stl`, `.dae`, `.obj`, `.gltf`, and `.glb`.
- Generates a slider for every revolute / continuous / prismatic joint with
  the URDF's declared limits enforced.
- Robot-attached X / Y / Z axis gizmo (red / green / blue) so you can spot
  flipped or mirrored joint axes at a glance.
- Static Next.js build — deploys to Vercel, Netlify, Cloudflare Pages, or any
  static host with zero configuration.

## Why a browser-based URDF viewer?

Traditional URDF inspection means installing ROS, sourcing a workspace,
running `roscore` / `ros2 launch`, opening RViz, and waiting for
`robot_state_publisher`. This viewer skips all of that: drop a zip, see the
robot. It is ideal for quickly checking a robot description shared on GitHub,
embedding live previews in a portfolio, or sanity-checking a teammate's xacro
changes.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- TypeScript and React 18
- [three.js](https://threejs.org/)
- [`urdf-loader`](https://github.com/gkjohnson/urdf-loaders) and
  [`xacro-parser`](https://github.com/gkjohnson/xacro-parser)
- [`jszip`](https://stuk.github.io/jszip/) for the in-memory virtual
  filesystem

## Local development

Requires Node.js 18.18 or newer (Node 20+ recommended).

```bash
npm install
npm run dev
# open http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # next lint
```

## Using the viewer

1. Open the deployed site (or `http://localhost:3000` during development).
2. Drag a `.zip` of your ROS package onto the viewport, or click **Open zip…**
   in the header. A workspace zip with several packages also works.
3. Pick a URDF or xacro file from the dropdown. The most likely main file is
   pre-selected.
4. Orbit / pan / zoom with the mouse. Use the right-hand panel to move every
   joint with a slider, or **Reset joints** to zero them.


For best search results after deploying:

1. Set `NEXT_PUBLIC_SITE_URL` to your real domain in the Vercel project
   settings.
2. Submit the deployed URL to
   [Google Search Console](https://search.google.com/search-console) and
   [Bing Webmaster Tools](https://www.bing.com/webmasters/) and request
   indexing.
3. On the GitHub repo, add topics such as `urdf`, `urdf-viewer`, `xacro`,
   `ros`, `ros2`, `robotics`, `threejs`, `nextjs`, `web-viewer`,
   `robot-visualization`. Topics are crawled by GitHub search and improve
   discoverability.
4. Link the deployed site from the repo's **About** sidebar.


## Project structure

```
app/
  layout.tsx          # root layout + global metadata + JSON-LD
  page.tsx            # server-rendered SEO content + ViewerLoader
  globals.css         # dark theme tokens
  robots.ts           # generated /robots.txt
  sitemap.ts          # generated /sitemap.xml
  opengraph-image.tsx # dynamic Open Graph image
components/
  Viewer.tsx          # three.js scene + URDF lifecycle
  ViewerLoader.tsx    # client wrapper that dynamic-imports Viewer
  JointPanel.tsx      # joint sliders
lib/
  zipFs.ts            # in-memory zip filesystem
  xacroProcess.ts     # xacro pipeline
  urdfLoad.ts         # URDF + mesh loader wiring
next.config.mjs
package.json
tsconfig.json
```

## Contributing

Issues and pull requests are welcome. Please run `npm run build` before
opening a PR.

## License

MIT.
