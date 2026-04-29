import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className="text-gradient">MemOS</span>
          <p>The safely evolving knowledge system.</p>
        </div>
        <div className={styles.links}>
          <div>
            <h4>Product</h4>
            <a href="#">Roadmap</a>
            <a href="#">Security</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#">Blog</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© 2026 MemOS. All rights reserved.</p>
      </div>
    </footer>
  );
}
