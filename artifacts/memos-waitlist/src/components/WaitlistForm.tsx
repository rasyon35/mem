import { useState } from "react";
import {
  useGetWaitlistStats,
  useJoinWaitlist,
  getGetWaitlistStatsQueryKey,
  type WaitlistJoinResponse,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./WaitlistForm.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitlistJoinResponse | null>(null);

  const queryClient = useQueryClient();
  const statsQuery = useGetWaitlistStats({
    query: { refetchInterval: 15_000 },
  });

  const joinMutation = useJoinWaitlist({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setEmail("");
        setRole("");
        queryClient.invalidateQueries({ queryKey: getGetWaitlistStatsQueryKey() });
      },
    },
  });

  const total = statsQuery.data?.totalSignups ?? 0;
  const isPending = joinMutation.isPending;
  const submittedSuccess = result !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    joinMutation.mutate({
      data: {
        email: trimmed,
        role: role.trim() || undefined,
      },
    });
  };

  const serverErrorMessage = joinMutation.isError
    ? joinMutation.error?.data?.message ??
      joinMutation.error?.message ??
      "Something went wrong. Please try again."
    : null;

  return (
    <section id="waitlist" className={styles.section}>
      <div className={`${styles.container} glass`}>
        {total > 0 && (
          <div className={styles.countBadge} aria-live="polite">
            <span className={styles.pulseDot} />
            <span>
              <strong>{formatCount(total)}</strong>{" "}
              {total === 1 ? "person has" : "people have"} joined
            </span>
          </div>
        )}

        <h2 className="text-gradient">Be first to install MemOS</h2>
        <p>
          We're onboarding a small pilot of students, researchers, and teams
          before the public launch. Drop your email and we'll send you the
          desktop build the moment it's ready.
        </p>

        {!submittedSuccess && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldStack}>
              <input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={styles.input}
                disabled={isPending}
                autoComplete="email"
                inputMode="email"
              />
              <input
                type="text"
                placeholder="You are… (optional — student, researcher, founder)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={styles.input}
                disabled={isPending}
                maxLength={80}
                autoComplete="organization-title"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
        )}

        {(validationError || serverErrorMessage) && !submittedSuccess && (
          <p className={styles.errorMsg} role="alert">
            {validationError ?? serverErrorMessage}
          </p>
        )}

        {submittedSuccess && result && (
          <div className={styles.successCard} aria-live="polite">
            <div className={styles.successHeader}>
              <span className={styles.checkmark} aria-hidden="true">
                ✓
              </span>
              <span>
                {result.alreadySignedUp
                  ? "You're already on the list."
                  : "Welcome to MemOS."}
              </span>
            </div>
            <div className={styles.positionLine}>
              You're <strong>#{formatCount(result.position)}</strong> in line ·{" "}
              {formatCount(result.totalSignups)} total signups
            </div>
            <p className={styles.successFinePrint}>
              We'll email <strong>{result.email}</strong> the moment your
              desktop build is ready. Forward this to a friend — pilot seats are
              limited.
            </p>
          </div>
        )}

        <p className={styles.privacyNote}>
          One email when MemOS Desktop launches. No newsletter, no spam, no
          tracking pixels.
        </p>
      </div>
    </section>
  );
}
