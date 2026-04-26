'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Spinner } from '@/components/Icons';

const API = 'http://localhost:8000/api';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [licenseKey, setLicenseKey] = useState('');
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    // Check if already setup
    axios.get(`${API}/setup/status`).then(res => {
      if (res.data.is_activated && step === 1) {
        // We could auto-skip, but keeping it visible for the setup flow
      }
    });
  }, []);

  const handleActivate = async () => {
    if (!licenseKey) return alert('Activation Key is required');

    setLoading(true);
    setValidationError('');
    try {
      const res = await axios.post(`${API}/setup/activate`, {
        license_key: licenseKey
      });

      if (res.data.valid) {
        setIsLicenseValid(true);
        setTimeout(() => setStep(3), 500); // Small delay for the success checkmark
      } else {
        setIsLicenseValid(false);
        setValidationError(res.data.error || 'Invalid key.');
      }
    } catch (err: any) {
      setIsLicenseValid(false);
      setValidationError(err.response?.data?.error || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSetup = async () => {
    setLoading(true);
    try {
      await axios.get(`${API}/setup/status`);
      setStep(4);
    } catch {
      alert('Failed to verify workspace readiness');
    } finally {
      setLoading(false);
    }
  };

  const finishSetup = () => {
    router.push('/dashboard/ingest');
  };

  return (
    <div className="setup-container">
      <div className="setup-backdrop">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="setup-card glass">
        {step === 1 && (
          <div className="setup-step animate-in">
            <div className="setup-icon-large">🧠</div>
            <h1 className="setup-title">Welcome to Mem Desktop</h1>
            <p className="setup-desc">
              Build your private knowledge workspace for study, research, and small-team docs.
            </p>
            <div className="oc-info-box mt-2" style={{ width: '100%', textAlign: 'left' }}>
              <strong>Privacy by default</strong>
              Your notes, sources, and processed content stay on this device. Cloud is used only for account and billing.
            </div>
            <button className="btn-setup-primary" onClick={() => setStep(2)}>
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step animate-in">
            <h2 className="setup-subtitle">Step 1: Activate Account</h2>
            <p className="setup-desc">Enter your license key to enable account and billing for this local workspace.</p>

            <div className="setup-form">
              <div className="input-group animate-in">
                <label>Activation Key</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`setup-input ${isLicenseValid === true ? 'border-success' : isLicenseValid === false ? 'border-error' : ''}`}
                    placeholder="MEM-XXXX-XXXX"
                    value={licenseKey}
                    onChange={e => { setLicenseKey(e.target.value); setIsLicenseValid(null); setValidationError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleActivate()}
                  />
                  {isLicenseValid === true && <span className="input-icon-right success">✓</span>}
                </div>
                {validationError && <p className="text-error-xs mt-1">{validationError}</p>}

                <button className="btn-setup-primary mt-4" onClick={handleActivate} disabled={loading || !licenseKey}>
                  {loading ? <Spinner /> : 'Activate MemOS'}
                </button>
                <div className="text-center mt-2">
                  <a href="#" className="input-hint">Need a license key?</a>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-step animate-in">
            <div className="setup-badge">Workspace Check</div>
            <h2 className="setup-subtitle">Step 2: Confirm Local Workspace</h2>
            <p className="setup-desc">
              Mem Desktop will use local storage for notes, sources, indexing, and history.
            </p>

            <div className="setup-options">
              <div className="oc-info-box" style={{ width: '100%' }}>
                <strong>Local-first architecture</strong>
                Workspace data is stored locally in your project workspace. Account, billing, and license checks are cloud-managed.
              </div>
            </div>

            <div className="setup-actions">
              <button className="btn-setup-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn-setup-primary" onClick={handleWorkspaceSetup} disabled={loading}>
                {loading ? <Spinner /> : 'Verify Workspace'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="setup-step animate-in">
            <div className="setup-icon-large success">🚀</div>
            <h1 className="setup-title">Workspace Ready</h1>
            <p className="setup-desc">
              Core features are now enabled: ingest, wiki, search, chat, and version history.
            </p>
            <button className="btn-setup-primary" onClick={finishSetup}>
              Launch Dashboard
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .setup-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
          color: #fff;
          overflow: hidden;
          position: relative;
        }

        .setup-backdrop {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.4;
          animation: float 20s infinite alternate;
        }

        .orb-1 {
          width: 500px;
          height: 500px;
          background: #00ffcc;
          top: -100px;
          left: -100px;
        }

        .orb-2 {
          width: 600px;
          height: 600px;
          background: #0066ff;
          bottom: -150px;
          right: -150px;
          animation-delay: -5s;
        }

        @keyframes float {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(100px, 50px) scale(1.1); }
        }

        .setup-card {
          width: 100%;
          max-width: 500px;
          padding: 3rem;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 15, 15, 0.7);
          backdrop-filter: blur(20px);
          z-index: 10;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .setup-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .animate-in {
          animation: slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .setup-icon-large {
          font-size: 4rem;
          margin-bottom: 1.5rem;
        }

        .setup-title {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .setup-subtitle {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .setup-desc {
          font-size: 1rem;
          color: #aaa;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .setup-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #666;
        }

        .setup-input {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s;
          width: 100%;
          text-align: center;
          letter-spacing: 0.1em;
          font-family: monospace;
        }

        .setup-input:focus {
          outline: none;
          border-color: #00ffcc;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(0, 255, 204, 0.1);
        }

        .border-success { border-color: #00ffcc !important; }
        .border-error { border-color: #ff4d4d !important; }

        .input-hint {
          font-size: 0.75rem;
          color: #00ffcc;
          text-decoration: none;
        }

        .input-icon-right {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-weight: bold;
        }
        .input-icon-right.success { color: #00ffcc; }

        .setup-actions {
          display: flex;
          gap: 1rem;
          width: 100%;
        }

        .btn-setup-primary {
          flex: 1;
          background: #fff;
          color: #000;
          border: none;
          padding: 0.875rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-setup-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
        }

        .btn-setup-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-setup-secondary {
          padding: 0.875rem 1.5rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .setup-options {
          width: 100%;
          text-align: left;
          margin-bottom: 2rem;
        }

        .option-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .option-card.active {
          background: rgba(0, 255, 204, 0.05);
          border-color: #00ffcc;
        }

        .option-info {
          display: flex;
          flex-direction: column;
        }

        .option-title {
          font-weight: 700;
          font-size: 0.9375rem;
        }

        .option-detail {
          font-size: 0.75rem;
          color: #666;
        }

        .setup-badge {
          background: #00ffcc;
          color: #000;
          font-size: 0.625rem;
          font-weight: 900;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 20px;
          margin-bottom: 0.5rem;
        }

        .oc-config-nested {
          margin-top: 1.5rem;
          padding-left: 1rem;
          border-left: 2px solid rgba(0, 255, 204, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .config-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px;
          border-radius: 10px;
        }

        .config-toggle button {
          flex: 1;
          padding: 6px;
          border: none;
          background: transparent;
          color: #666;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .config-toggle button.active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .setup-input-small {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          color: #fff;
          font-size: 0.875rem;
          width: 100%;
        }

        .oc-info-box {
          padding: 1rem;
          background: rgba(0, 102, 255, 0.05);
          border: 1px solid rgba(0, 102, 255, 0.2);
          border-radius: 12px;
          font-size: 0.75rem;
          color: #888;
          line-height: 1.4;
        }

        .oc-info-box strong {
          display: block;
          color: #0066ff;
          margin-bottom: 0.25rem;
        }

        .text-error-xs { font-size: 0.75rem; color: #ff4d4d; margin-top: 0.25rem; }
        .text-center { text-align: center; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .relative { position: relative; width: 100%; }
      `}</style>
    </div>
  );
}
