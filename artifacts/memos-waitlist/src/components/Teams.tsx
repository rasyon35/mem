import styles from "./Teams.module.css";

const presets = [
  { label: "Startup", icon: "🚀" },
  { label: "Research lab", icon: "🔬" },
  { label: "Study group", icon: "📚" },
  { label: "Family", icon: "🏠" },
  { label: "Operations", icon: "⚙️" },
];

const capabilities = [
  {
    title: "Shared wiki with publish states",
    description:
      "Any member can draft a page. Promote it to Team-Shared when it's worth a look, then to Canonical once the team agrees it's the source of truth.",
    icon: "📄",
  },
  {
    title: "Branches & conflict resolution",
    description:
      "Work on a branch without stepping on each other. When two members write contradicting facts, MemOS surfaces the conflict and walks you through a merge.",
    icon: "🌿",
  },
  {
    title: "Pooled ingestion & graph",
    description:
      "Drop sources into the team workspace and everyone gets the same indexed knowledge. The team graph shows who knows what and where ideas connect.",
    icon: "🕸️",
  },
  {
    title: "Roles, audit, and activity",
    description:
      "Owner, Editor, and Viewer roles. A live activity feed, in-app notifications, and a tamper-proof audit log keep the whole team honest.",
    icon: "🔐",
  },
];

export default function Teams() {
  return (
    <section id="teams" className={styles.section}>
      <div className={styles.header}>
        <div className={styles.eyebrow}>Built for small teams (3–15 people)</div>
        <h2 className="text-gradient">Bring your team into the same brain</h2>
        <p>
          Flip a workspace from solo to shared in one click. MemOS Desktop ships
          with team presets for the way real small teams actually work — no
          enterprise admin console required.
        </p>
      </div>

      <ul className={styles.presets} aria-label="Team workspace presets">
        {presets.map((p) => (
          <li key={p.label} className={`${styles.preset} glass`}>
            <span aria-hidden="true">{p.icon}</span>
            <span>{p.label}</span>
          </li>
        ))}
      </ul>

      <div className={styles.grid}>
        {capabilities.map((cap) => (
          <div key={cap.title} className={`${styles.card} glass`}>
            <div className={styles.icon}>{cap.icon}</div>
            <h3>{cap.title}</h3>
            <p>{cap.description}</p>
          </div>
        ))}
      </div>

      <p className={styles.footnote}>
        Visibility your call: keep a team space <strong>private</strong> behind
        invites, share with a <strong>link</strong>, or make it{" "}
        <strong>discoverable</strong> to the rest of your org.
      </p>
    </section>
  );
}
