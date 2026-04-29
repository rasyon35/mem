import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className="text-gradient">MemOS</span>
          <p>Your private knowledge, indexed locally.</p>
        </div>
        <div className={styles.links}>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#waitlist">Pilot Cohort</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">Privacy</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© 2026 MemOS Desktop. Local-first. Built for thinkers.</p>
      </div>
    </footer>
  );
}
