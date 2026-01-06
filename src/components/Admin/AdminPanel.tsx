import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, X, RefreshCw } from 'lucide-react';
import type { MealSubmission } from '../../types';

interface AdminPanelProps {
  submissions: MealSubmission[];
  pendingCount: number;
  onApprove: (submissionId: string, submitterName?: string) => Promise<boolean>;
  onReject: (submissionId: string, reason: string) => Promise<boolean>;
  onRefresh: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  submissions,
  pendingCount,
  onApprove,
  onReject,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (submission: MealSubmission) => {
    setProcessingId(submission.id);
    await onApprove(submission.id, submission.submittedByEmail?.split('@')[0]);
    setProcessingId(null);
  };

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      return;
    }
    setProcessingId(submissionId);
    await onReject(submissionId, rejectionReason);
    setProcessingId(null);
    setRejectingId(null);
    setRejectionReason('');
  };

  return (
    <div className="admin-panel">
      <button
        className="admin-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="admin-header-left">
          <Shield size={18} className="admin-icon" />
          <span>Admin: Pending Approvals</span>
          {pendingCount > 0 && (
            <span className="pending-count-badge">{pendingCount}</span>
          )}
        </div>
        <div className="admin-header-right">
          <button
            className="refresh-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRefresh();
            }}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className="admin-content">
          {submissions.length === 0 ? (
            <div className="no-pending">
              <Check size={24} className="all-clear-icon" />
              <p>All caught up! No pending submissions.</p>
            </div>
          ) : (
            <div className="submissions-list">
              {submissions.map((submission) => (
                <div key={submission.id} className="submission-review-card">
                  <div className="submission-details">
                    <h4 className="submission-name">{submission.name}</h4>
                    <p className="submission-macros">
                      {submission.calories} cal • {submission.protein}g P • {submission.carbs}g C • {submission.fat}g F
                    </p>
                    <p className="submission-author">
                      Submitted by: {submission.submittedByEmail || 'Unknown'}
                    </p>
                    {submission.recipe && (
                      <span className="has-recipe-badge">Has Recipe</span>
                    )}
                  </div>

                  {rejectingId === submission.id ? (
                    <div className="rejection-form">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        autoFocus
                      />
                      <div className="rejection-actions">
                        <button
                          className="cancel-reject-btn"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="confirm-reject-btn"
                          onClick={() => handleReject(submission.id)}
                          disabled={!rejectionReason.trim() || processingId === submission.id}
                        >
                          {processingId === submission.id ? 'Rejecting...' : 'Confirm Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="submission-actions">
                      <button
                        className="approve-btn"
                        onClick={() => handleApprove(submission)}
                        disabled={processingId === submission.id}
                      >
                        {processingId === submission.id ? (
                          'Approving...'
                        ) : (
                          <>
                            <Check size={16} />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => setRejectingId(submission.id)}
                        disabled={processingId === submission.id}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
