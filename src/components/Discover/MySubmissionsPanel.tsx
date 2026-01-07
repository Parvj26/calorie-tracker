import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Check, X, Trash2 } from 'lucide-react';
import type { MealSubmission } from '../../types';

interface MySubmissionsPanelProps {
  submissions: MealSubmission[];
  onCancelSubmission: (submissionId: string) => Promise<boolean>;
}

export const MySubmissionsPanel: React.FC<MySubmissionsPanelProps> = ({
  submissions,
  onCancelSubmission,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const handleCancel = async (submissionId: string) => {
    setCancelingId(submissionId);
    await onCancelSubmission(submissionId);
    setCancelingId(null);
  };

  const getStatusIcon = (status: MealSubmission['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={14} className="status-icon pending" />;
      case 'approved':
        return <Check size={14} className="status-icon approved" />;
      case 'rejected':
        return <X size={14} className="status-icon rejected" />;
    }
  };

  const getStatusText = (status: MealSubmission['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
    }
  };

  if (submissions.length === 0) {
    return null;
  }

  return (
    <div className="my-submissions-panel">
      <button
        className="submissions-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="submissions-header-left">
          <span>My Submissions</span>
          {pendingCount > 0 && (
            <span className="pending-badge">{pendingCount} pending</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isExpanded && (
        <div className="submissions-content">
          {submissions.map((submission) => (
            <div key={submission.id} className={`submission-item ${submission.status}`}>
              <div className="submission-info">
                <span className="submission-name">{submission.name}</span>
                <span className="submission-macros">
                  {submission.calories} cal • {submission.protein}g P • {submission.carbs}g C • {submission.fat}g F
                </span>
                <span className="submission-macros secondary">
                  {submission.fiber || 0}g fiber • {submission.sugar || 0}g sugar
                </span>
                <div className="submission-status">
                  {getStatusIcon(submission.status)}
                  <span>{getStatusText(submission.status)}</span>
                </div>
                {submission.status === 'rejected' && submission.rejectionReason && (
                  <span className="rejection-reason">
                    Reason: {submission.rejectionReason}
                  </span>
                )}
              </div>
              {submission.status === 'pending' && (
                <button
                  className="cancel-submission-btn"
                  onClick={() => handleCancel(submission.id)}
                  disabled={cancelingId === submission.id}
                  title="Cancel submission"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
