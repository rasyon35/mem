import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import { Step1_Identity } from './Step1_Identity';
import { Step2_Visibility } from './Step2_Visibility';
import { Step3_Permissions } from './Step3_Permissions';
import type { CreateTeamPayload } from '@/types/team';
import './TeamCreationFlow.css';

interface TeamCreationFlowProps {
  onClose: () => void;
}

export const TeamCreationFlow = ({ onClose }: TeamCreationFlowProps) => {
  const [step, setStep] = useState(1);
  const [payload, setPayload] = useState<Partial<CreateTeamPayload>>({});
  const [loading, setLoading] = useState(false);
  const { loadTeams } = useWorkspace();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await teamApi.createTeam(payload as CreateTeamPayload);
      await loadTeams();
      onClose();
    } catch (err) {
      console.error('Failed to create team:', err);
      alert('Failed to create team. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="team-creation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="creation-header">
          <h2>Create Team Space</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="step-indicator">
          <div className={`step ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            {step > 1 ? '✓' : '1'}
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            {step > 2 ? '✓' : '2'}
          </div>
          <div className="step-line"></div>
          <div className={`step ${step === 3 ? 'active' : ''}`}>3</div>
        </div>

        {step === 1 && (
          <Step1_Identity
            payload={payload}
            setPayload={setPayload}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2_Visibility
            payload={payload}
            setPayload={setPayload}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3_Permissions
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};