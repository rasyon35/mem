import type { TeamRole } from '@/types/team';
import './TeamCreationFlow.css';

interface Step3Props {
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export const Step3_Permissions = ({ onSubmit, onBack, loading }: Step3Props) => {
  return (
    <div className="step-content">
      <h3>Step 3: Default Permissions</h3>
      <div className="permissions-info">
        <p>Select the default role for new members:</p>
      </div>
      <div className="role-cards">
        <div className="role-card">
          <h4>Owner</h4>
          <p>Full control over team settings, members, and permissions</p>
          <span className="role-level">Full Access</span>
        </div>
        <div className="role-card recommended">
          <h4>Editor</h4>
          <p>Can create/edit pages, upload files, contribute to graph</p>
          <span className="role-level">Recommended</span>
        </div>
        <div className="role-card">
          <h4>Viewer</h4>
          <p>Read-only access, can search and ask AI</p>
          <span className="role-level">Limited</span>
        </div>
      </div>
      <div className="step-actions">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <button className="submit-btn" onClick={onSubmit} disabled={loading}>
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </div>
    </div>
  );
};