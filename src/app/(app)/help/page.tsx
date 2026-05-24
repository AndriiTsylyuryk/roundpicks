export default function HelpPage() {
  return (
    <div style={{ maxWidth: 480, margin: "3rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontFamily: "var(--font-display, system-ui)", fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        Help
      </h1>
      <p style={{ fontSize: "0.9375rem", color: "var(--color-ink-soft)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        Have a question or need help? Write to us:
      </p>
      <a
        href="mailto:info@roundpicks.com"
        style={{
          display: "inline-block",
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--color-primary)",
          textDecoration: "underline",
        }}
      >
        info@roundpicks.com
      </a>
    </div>
  );
}
