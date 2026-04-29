import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.badge} animate-fade-in`}>
        <span>✨ A local-first desktop app · Private by default</span>
      </div>
      <h1 className={`${styles.title} animate-fade-in`}>
        Your private wiki, <span className="text-gradient">written by your sources.</span>
      </h1>
      <p className={`${styles.subtitle} animate-fade-in`}>
        MemOS Desktop turns your PDFs, docs, web pages, and notes into a living
        knowledge wiki — indexed locally, refined by AI, and updated only when
        you approve.
      </p>
      <div className={`${styles.actions} animate-fade-in`}>
        <button
          className="btn-primary"
          onClick={() =>
            document
              .getElementById("waitlist")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Get Early Access
        </button>
        <button
          className="btn-secondary"
          onClick={() =>
            document
              .getElementById("features")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        >
          How it works
        </button>
      </div>

      {/* Decorative Visual */}
      <div className={styles.visualContainer}>
        <div className={`${styles.visual} glass`}>
          <div className={styles.visualHeader}>
            <div className={styles.dots}><div /><div /><div /></div>
            <span>memos · local workspace / wiki</span>
          </div>
          <div className={styles.visualContent}>
            <div className={styles.codeLine} style={{ width: '80%' }} />
            <div className={styles.codeLine} style={{ width: '60%' }} />
            <div className={styles.codeLineGradient} style={{ width: '90%' }} />
            <div className={styles.codeLine} style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
