import { useState } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { teamApi } from '../../../api/teams';
import './TeamIngestion.css';

export const TeamIngestion = () => {
  const { currentTeam } = useWorkspace();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDestination, setUploadDestination] = useState<'team' | 'personal'>('team');

  const handleFiles = async (files: FileList) => {
    if (!currentTeam) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await teamApi.uploadToTeam(currentTeam.id, files[i], uploadDestination === 'team');
      }
      alert('Files uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  if (!currentTeam) return <div className="team-ingestion-empty">No team selected</div>;

  return (
    <div className="team-ingestion">
      <div className="ingestion-header">
        <h2>Team Ingestion</h2>
        <p className="ingestion-description">
          Upload files to your team. AI will ask: "Add to Team or Personal?"
        </p>
      </div>

      <div className="upload-destination">
        <h3>Upload Destination</h3>
        <div className="destination-options">
          <div
            className={`destination-card ${uploadDestination === 'team' ? 'selected' : ''}`}
            onClick={() => setUploadDestination('team')}
          >
            <span className="destination-icon">👥</span>
            <h4>Team</h4>
            <p>Shared with all team members</p>
          </div>
          <div
            className={`destination-card ${uploadDestination === 'personal' ? 'selected' : ''}`}
            onClick={() => setUploadDestination('personal')}
          >
            <span className="destination-icon">👤</span>
            <h4>Personal</h4>
            <p>Private to you</p>
          </div>
        </div>
      </div>

      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-zone-content">
          <span className="upload-icon">📎</span>
          <p>Drag & drop files here, or click to browse</p>
          <input
            type="file"
            multiple
            onChange={handleChange}
            disabled={uploading}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label htmlFor="file-input" className="browse-btn">
            {uploading ? 'Uploading...' : 'Browse Files'}
          </label>
        </div>
      </div>

      <div className="supported-formats">
        <h3>Supported Formats</h3>
        <div className="format-tags">
          <span className="format-tag">PDF</span>
          <span className="format-tag">Markdown</span>
          <span className="format-tag">Audio</span>
          <span className="format-tag">Docs</span>
          <span className="format-tag">Notes</span>
        </div>
      </div>
    </div>
  );
};