import styles from "./Features.module.css";

const features = [
  {
    title: "Git-Style Governance",
    description: "Every update is a commit. Branch, merge, and revert knowledge with the same rigor you use for code.",
    icon: "📜",
    gridArea: "git"
  },
  {
    title: "AI-Human Collaboration",
    description: "AI proposes updates based on new company data; humans provide the final verification.",
    icon: "🤝",
    gridArea: "collab"
  },
  {
    title: "Universal Ingestion",
    description: "Connect Slack, Notion, Jira, and local files. MemOS builds the connections for you.",
    icon: "🔗",
    gridArea: "ingest"
  },
  {
    title: "Safe Evolution",
    description: "Never lose a 'Source of Truth'. Audit logs and historical views are built into the core.",
    icon: "🛡️",
    gridArea: "safe"
  }
];

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.header}>
        <h2 className="text-gradient">Built for Trust</h2>
        <p>A wiki that doesn't just store info—it manages it safely.</p>
      </div>

      <div className={styles.grid}>
        {features.map((feature) => (
          <div
            key={feature.title}
            className={`${styles.card} glass`}
            style={{ gridArea: feature.gridArea }}
          >
            <div className={styles.icon}>{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
