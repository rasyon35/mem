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
    <div className="flex h-screen w-screen items-center justify-center bg-bg-900 text-text-primary overflow-hidden">
      <div className="w-full max-w-md p-8">
        {step === 1 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <h1 className="text-xl font-semibold mb-2 text-text-primary">Welcome to Mem Desktop</h1>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Build your private knowledge workspace for study, research, and small-team docs.
            </p>
            <div className="w-full p-4 bg-surface-2 border border-border-subtle rounded-md text-left mb-8 text-xs text-text-secondary leading-relaxed">
              <strong className="block text-text-primary mb-1">Privacy by default</strong>
              Your notes, sources, and processed content stay on this device. Cloud is used only for account and billing.
            </div>
            <button className="btn-primary w-full justify-center" onClick={() => setStep(2)}>
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col animate-fade-in">
            <h2 className="text-lg font-semibold mb-2 text-text-primary text-center">Step 1: Activate Account</h2>
            <p className="text-sm text-text-secondary mb-8 text-center leading-relaxed">Enter your license key to enable account and billing for this local workspace.</p>

            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-widest">Activation Key</label>
                <div className="relative">
                  <input
                    type="text"
                    className={`w-full bg-surface-2 border rounded-md px-3 py-2 text-sm text-text-primary font-mono outline-none transition-colors ${isLicenseValid === true ? 'border-success' : isLicenseValid === false ? 'border-error' : 'border-border-strong focus:border-accent'}`}
                    placeholder="MEM-XXXX-XXXX"
                    value={licenseKey}
                    onChange={e => { setLicenseKey(e.target.value); setIsLicenseValid(null); setValidationError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleActivate()}
                  />
                  {isLicenseValid === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success text-sm">✓</span>}
                </div>
                {validationError && <p className="text-xs text-error mt-1">{validationError}</p>}
              </div>

              <button className="btn-primary w-full justify-center mt-2" onClick={handleActivate} disabled={loading || !licenseKey}>
                {loading ? <Spinner /> : 'Activate MemOS'}
              </button>
              <div className="text-center mt-2">
                <a href="#" className="text-xs text-text-muted hover:text-text-primary transition-colors">Need a license key?</a>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="text-[10px] font-bold tracking-widest uppercase bg-surface-2 border border-border-subtle text-text-muted px-2 py-1 rounded-sm mb-4">Workspace Check</div>
            <h2 className="text-lg font-semibold mb-2 text-text-primary">Step 2: Confirm Local Workspace</h2>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Mem Desktop will use local storage for notes, sources, indexing, and history.
            </p>

            <div className="w-full text-left mb-8">
              <div className="p-4 bg-surface-2 border border-border-subtle rounded-md text-xs text-text-secondary leading-relaxed">
                <strong className="block text-text-primary mb-1">Local-first architecture</strong>
                Workspace data is stored locally in your project workspace. Account, billing, and license checks are cloud-managed.
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleWorkspaceSetup} disabled={loading}>
                {loading ? <Spinner /> : 'Verify Workspace'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <h1 className="text-xl font-semibold mb-2 text-text-primary mt-4">Workspace Ready</h1>
            <p className="text-sm text-text-secondary mb-8 leading-relaxed">
              Core features are now enabled: ingest, wiki, search, chat, and version history.
            </p>
            <button className="btn-primary w-full justify-center" onClick={finishSetup}>
              Launch Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
