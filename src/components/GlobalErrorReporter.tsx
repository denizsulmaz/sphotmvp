"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

/** Mounts window-level error listeners; renders nothing. */
export default function GlobalErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (e.error) reportError(e.error, "client");
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      reportError(e.reason, "unhandledrejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
