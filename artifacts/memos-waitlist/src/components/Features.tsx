import styles from "./Features.module.css";

const features = [
  {
    title: "Universal Ingestion",
    description:
      "Drop in PDFs, .docx, Markdown, web pages, or voice notes. MemOS parses, chunks, and indexes everything into a local vector workspace.",
    icon: "📥",
    gridArea: "ingest",
  },
  {
    title: "Local-First & Private",
    description:
      "Your sources, notes, and embeddings live on your machine. Only your account, billing, and license touch the cloud.",
    icon: "🔒",
    gridArea: "git",
  },
  {
    title: "Approve, Don't Babysit",
    description:
      "Every AI-proposed edit is staged like a pull request. Approve, tweak, or revert — with full version history, snapshots, and branches.",
    icon: "🤝",
    gridArea: "collab",
  },
  {
    title: "Page-Context Chat & Graph",
    description:
      "Ask anything; get answers cited to the source page. Explore how concepts connect in a 2D and 3D knowledge graph.",
    icon: "🧠",
    gridArea: "safe",
  },
];

export default function Features() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.header}>
        <h2 className="text-gradient">A wiki that maintains itself</h2>
        <p>
          Built for students, researchers, and small teams who want their
          knowledge organized — without giving it away to a cloud they don't
          control.
        </p>
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
