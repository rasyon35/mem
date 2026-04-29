import type { TeamCategory } from '@/types/team';
import './TeamCreationFlow.css';

interface Step1Props {
  payload: any;
  setPayload: (data: any) => void;
  onNext: () => void;
}

export const Step1_Identity = ({ payload, setPayload, onNext }: Step1Props) => {
  const isValid = payload.name && payload.description;

  return (
    <div className="step-content">
      <h3>Step 1: Team Identity</h3>
      <div className="form-group">
        <label>Team Name</label>
        <input
          type="text"
          value={payload.name || ''}
          onChange={(e) => setPayload({ ...payload, name: e.target.value })}
          placeholder="Enter team name"
        />
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea
          value={payload.description || ''}
          onChange={(e) => setPayload({ ...payload, description: e.target.value })}
          placeholder="What is this team for?"
          rows={3}
        />
      </div>
      <div className="form-group">
        <label>Category</label>
        <select
          value={payload.category || 'custom'}
          onChange={(e) => setPayload({ ...payload, category: e.target.value })}
        >
          <option value="startup">Startup</option>
          <option value="research">Research</option>
          <option value="study_group">Study Group</option>
          <option value="family">Family</option>
          <option value="operations">Operations</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div className="form-group">
        <label>Team Avatar/Icon (Emoji)</label>
        <input
          type="text"
          value={payload.avatar || ''}
          onChange={(e) => setPayload({ ...payload, avatar: e.target.value })}
          placeholder="🚀"
          maxLength={2}
        />
      </div>
      <div className="step-actions">
        <button className="next-btn" onClick={onNext} disabled={!isValid}>
          Next →
        </button>
      </div>
    </div>
  );
};