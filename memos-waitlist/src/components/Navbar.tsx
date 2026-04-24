"use client";

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
          <a href="#about">About</a>
          <button className="btn-primary">Join Waitlist</button>
        </div>
      </div>
    </nav>
  );
}
