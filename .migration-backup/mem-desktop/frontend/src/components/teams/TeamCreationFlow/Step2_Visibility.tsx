import type { TeamVisibility } from '@/types/team';
import './TeamCreationFlow.css';

interface Step2Props {
  payload: any;
  setPayload: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step2_Visibility = ({ payload, setPayload, onNext, onBack }: Step2Props) => {
  return (
    <div className="step-content">
      <h3>Step 2: Visibility</h3>
      <div className="visibility-options">
        <div
          className={`visibility-card ${payload.visibility === 'private_invite_only' ? 'selected' : ''}`}
          onClick={() => setPayload({ ...payload, visibility: 'private_invite_only' })}
        >
          <span className="visibility-icon">🔒</span>
          <h4>Private Invite Only</h4>
          <p>Only invited members can join</p>
        </div>
        <div
          className={`visibility-card ${payload.visibility === 'link_access' ? 'selected' : ''}`}
          onClick={() => setPayload({ ...payload, visibility: 'link_access' })}
        >
          <span className="visibility-icon">🔗</span>
          <h4>Link Access</h4>
          <p>Anyone with the link can join</p>
        </div>
        <div
          className={`visibility-card ${payload.visibility === 'discoverable' ? 'selected' : ''}`}
          onClick={() => setPayload({ ...payload, visibility: 'discoverable' })}
        >
          <span className="visibility-icon">🌐</span>
          <h4>Discoverable</h4>
          <p>Visible in team directory</p>
        </div>
      </div>
      <div className="step-actions">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <button className="next-btn" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
};