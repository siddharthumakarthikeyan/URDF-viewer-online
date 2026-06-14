import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://urdf-viewer-online.vercel.app";

export const viewport: Viewport = {
  themeColor: "#0f1115",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "URDF Viewer Online — View ROS URDF & xacro Robots in Your Browser",
    template: "%s · URDF Viewer Online",
  },
  description:
    "Free online URDF viewer. Drag-and-drop a ROS package zip and inspect URDF or xacro robot models in 3D with real-time joint sliders. No install, no upload — everything runs in your browser.",
  applicationName: "URDF Viewer Online",
  generator: "Next.js",
  keywords: [
    "URDF viewer",
    "online URDF viewer",
    "URDF viewer online",
    "xacro viewer",
    "ROS URDF",
    "ROS 2 URDF",
    "ROS robot visualizer",
    "URDF visualization",
    "robot model viewer",
    "3D URDF viewer",
    "browser URDF viewer",
    "view URDF in browser",
    "URDF web viewer",
    "URDF 3D",
    "URDF inspector",
    "ros_gz",
    "three.js URDF",
    "urdf-loader",
    "RViz alternative",
    "robotics visualization",
    "STL DAE robot mesh viewer",
  ],
  authors: [{ name: "Siddharth Uma Karthikeyan" }],
  creator: "Siddharth Uma Karthikeyan",
  publisher: "Siddharth Uma Karthikeyan",
  category: "technology",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "URDF Viewer Online",
    title:
      "URDF Viewer Online — View ROS URDF & xacro Robots in Your Browser",
    description:
      "Drag-and-drop a ROS package zip and inspect URDF / xacro robot models in 3D with joint sliders. 100% client-side.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "URDF Viewer Online",
    description:
      "Free, in-browser viewer for ROS URDF and xacro robot models. Drag, drop, inspect.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "URDF Viewer Online",
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any (browser)",
      browserRequirements: "Requires WebGL2",
      description:
        "Free in-browser viewer for ROS URDF and xacro robot models. Drag-and-drop a package zip, render the robot in 3D, and move every joint with a slider. Files never leave your machine.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Person", name: "Siddharth Uma Karthikeyan" },
      keywords:
        "URDF viewer, online URDF viewer, xacro viewer, ROS URDF, robot model viewer, 3D URDF, browser URDF viewer, RViz alternative",
    },
    {
      "@type": "SoftwareSourceCode",
      name: "URDF Viewer Online",
      codeRepository:
        "https://github.com/siddharthumakarthikeyan/URDF-viewer-online",
      programmingLanguage: ["TypeScript", "JavaScript"],
      runtimePlatform: "Next.js",
      license: "https://opensource.org/licenses/MIT",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is a URDF viewer?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A URDF (Unified Robot Description Format) viewer renders the 3D model of a ROS robot from its URDF or xacro description and lets you move its joints. URDF Viewer Online runs entirely in your browser, so you can inspect a robot without installing ROS, Gazebo, or RViz.",
          },
        },
        {
          "@type": "Question",
          name: "Can I open xacro files directly?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Xacro files are processed in the browser using xacro-parser, with package.xml and $(find pkg) references resolved from the dropped zip.",
          },
        },
        {
          "@type": "Question",
          name: "Are my files uploaded anywhere?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. The viewer is a static site. The zip is read, parsed, and rendered entirely in your browser; nothing is sent to any server.",
          },
        },
        {
          "@type": "Question",
          name: "Which mesh formats are supported?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "STL, DAE (Collada), OBJ, GLTF, and GLB visual meshes referenced via package://, $(find ...), relative, or absolute paths inside the zip.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
