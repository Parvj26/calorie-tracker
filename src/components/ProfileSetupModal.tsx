import { useState } from 'react';
import { User } from 'lucide-react';
import type { Gender } from '../types';

interface ProfileSetupModalProps {
  onComplete: (profile: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: Gender;
  }) => Promise<boolean>;
}

export function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    setSaving(true);
    setError('');

    const success = await onComplete({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
    });

    if (!success) {
      setError('Failed to save profile. Please try again.');
    }
    setSaving(false);
  };

  return (
    <div className="profile-setup-overlay">
      <div className="profile-setup-modal">
        <div className="profile-setup-header">
          <div className="profile-setup-icon">
            <User size={32} />
          </div>
          <h2>Complete Your Profile</h2>
          <p>Tell us a bit about yourself to personalize your experience</p>
        </div>

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dateOfBirth">Date of Birth</label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | '')}
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {error && <div className="profile-setup-error">{error}</div>}

          <button type="submit" className="btn btn-primary profile-setup-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
