import React from 'react';

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 160,
  strokeWidth = 12,
  label,
  sublabel,
  color = '#10b981',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(100, (value / max) * 100);
  const offset = circumference - (percent / 100) * circumference;

  // Color changes based on progress
  const getColor = () => {
    if (percent > 100) return '#ef4444'; // red - over target
    if (percent >= 80) return '#f59e0b'; // amber - approaching target
    return color; // green - on track
  };

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="circular-progress-content">
        <span className="circular-progress-value">{Math.round(value)}</span>
        {label && <span className="circular-progress-label">{label}</span>}
        {sublabel && <span className="circular-progress-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
};
