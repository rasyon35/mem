"use client";

import { useState } from "react";
import styles from "./WaitlistForm.module.css";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    // Simulate API call
    setTimeout(() => {
      setStatus("success");
      setEmail("");
    }, 1500);
  };

  return (
    <section id="waitlist" className={styles.section}>
      <div className={`${styles.container} glass`}>
        <h2 className="text-gradient">Secure Your Spot</h2>
        <p>Join the waitlist for the next generation of knowledge management.</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input 
            type="email" 
            placeholder="Enter your work email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
            disabled={status === "loading" || status === "success"}
          />
          <button 
            type="submit" 
            className="btn-primary"
            disabled={status === "loading" || status === "success"}
          >
            {status === "loading" ? "Joining..." : status === "success" ? "You're In!" : "Join Waitlist"}
          </button>
        </form>
        
        {status === "success" && (
          <p className={styles.successMsg}>✨ Welcome to the future of wikis. We'll be in touch soon.</p>
        )}
      </div>
    </section>
  );
}
