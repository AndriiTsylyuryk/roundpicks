"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 2000,
        style: {
          background: "var(--color-ink)",
          color: "var(--color-paper)",
          borderRadius: "var(--radius-md)",
          fontSize: "0.875rem",
          padding: "0.625rem 1rem",
        },
      }}
    />
  );
}
