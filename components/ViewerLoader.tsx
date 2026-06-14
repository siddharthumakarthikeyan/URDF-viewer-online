"use client";

import dynamic from "next/dynamic";

const Viewer = dynamic(() => import("@/components/Viewer"), { ssr: false });

export default function ViewerLoader() {
  return <Viewer />;
}
