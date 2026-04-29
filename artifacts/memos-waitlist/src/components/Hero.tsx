import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`${styles.badge} animate-fade-in`}>
        <span>✨ AI-Powered & Git-Secured</span>
      </div>
      <h1 className={`${styles.title} animate-fade-in`}>
        The <span className="text-gradient">Living Wiki</span> for Modern Teams
      </h1>
      <p className={`${styles.subtitle} animate-fade-in`}>
        MemOS turns all company information into a knowledge system that evolves safely
        through Git-style version control and human-reviewed AI updates.
      </p>
      <div className={`${styles.actions} animate-fade-in`}>
        <button className="btn-primary">Get Early Access</button>
        <button className="btn-secondary">Watch Demo</button>
      </div>

      {/* Decorative Visual */}
      <div className={styles.visualContainer}>
        <div className={`${styles.visual} glass`}>
          <div className={styles.visualHeader}>
            <div className={styles.dots}><div /><div /><div /></div>
            <span>memos.wiki / core-knowledge</span>
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
