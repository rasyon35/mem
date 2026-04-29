import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={`${styles.nav} glass`}>
      <div className={styles.container}>
        <div className={styles.logo}>
          <span className="text-gradient">MemOS</span>
        </div>
        <div className={styles.links}>
          <a href="#features">Features</a>
          <a href="#waitlist">Pilot</a>
          <button
            className="btn-primary"
            onClick={() =>
              document
                .getElementById("waitlist")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Join Waitlist
          </button>
        </div>
      </div>
    </nav>
  );
}
