import React, { useState, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Upload, Loader2, Check, AlertCircle, Trash2, X, ChevronDown, ChevronUp, Edit3, AlertTriangle } from 'lucide-react';
import type { InBodyScan, AIProvider } from '../types';
import { extractInBodyData } from '../utils/openai';
import { groqExtractInBodyData } from '../utils/groq';

interface InBodyUploadProps {
  scans: InBodyScan[];
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  groqApiKeyBackup?: string;
  onAddScan: (scan: Omit<InBodyScan, 'id'>) => void;
  onDeleteScan: (id: string) => void;
}

interface ExtractedData {
  // Basic metrics
  weight: number;
  bodyFatPercent: number;
  muscleMass: number;
  skeletalMuscle: number;
  scanDate: string;
  imageData: string;
  // Enhanced metrics (Tier 1)
  bmr?: number;
  fatMass?: number;
  visceralFatGrade?: number;
  // Enhanced metrics (Tier 2)
  waterWeight?: number;
  trunkFatMass?: number;
  bodyAge?: number;
  proteinMass?: number;
  boneMass?: number;
}

export const InBodyUpload: React.FC<InBodyUploadProps> = ({
  scans,
  aiProvider,
  openAiApiKey,
  groqApiKey,
  groqApiKeyBackup,
  onAddScan,
  onDeleteScan,
}) => {
  const apiKey = aiProvider === 'groq' ? groqApiKey : openAiApiKey;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [existingScanDate, setExistingScanDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if a scan with the given date already exists
  const checkExistingScan = (date: string): InBodyScan | undefined => {
    return scans.find((s) => s.date === date);
  };

  // Start manual entry with empty form
  const handleStartManualEntry = () => {
    setIsManualEntry(true);
    setExtractedData({
      weight: 0,
      bodyFatPercent: 0,
      muscleMass: 0,
      skeletalMuscle: 0,
      scanDate: format(new Date(), 'yyyy-MM-dd'),
      imageData: '', // No image for manual entry
    });
    setError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      setError(`Please add your ${aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings first`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        try {
          let data;
          if (aiProvider === 'groq') {
            // Use Groq API (with automatic fallback to backup key if rate limited)
            data = await groqExtractInBodyData(base64, groqApiKey, groqApiKeyBackup);
          } else {
            data = await extractInBodyData(base64, apiKey);
          }

          setExtractedData({
            weight: data.weight || 0,
            bodyFatPercent: data.bodyFatPercent || 0,
            muscleMass: data.muscleMass || 0,
            skeletalMuscle: data.skeletalMuscle || 0,
            scanDate: data.scanDate || format(new Date(), 'yyyy-MM-dd'),
            imageData: base64,
            // Enhanced metrics
            bmr: data.bmr || undefined,
            fatMass: data.fatMass || undefined,
            visceralFatGrade: data.visceralFatGrade || undefined,
            waterWeight: data.waterWeight || undefined,
            trunkFatMass: data.trunkFatMass || undefined,
            bodyAge: data.bodyAge || undefined,
            proteinMass: data.proteinMass || undefined,
            boneMass: data.boneMass || undefined,
          });

          // Auto-expand advanced if we have enhanced metrics
          if (data.bmr || data.fatMass || data.visceralFatGrade) {
            setShowAdvanced(true);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to extract data from image');
        }

        setIsUploading(false);
      };

      reader.onerror = () => {
        setError('Failed to read file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmScan = () => {
    if (!extractedData) return;

    // Validation
    if (extractedData.visceralFatGrade && (extractedData.visceralFatGrade < 1 || extractedData.visceralFatGrade > 20)) {
      setError('Visceral fat grade must be between 1 and 20');
      return;
    }

    if (extractedData.bmr && (extractedData.bmr < 1000 || extractedData.bmr > 3500)) {
      setError('BMR seems unusual (expected 1000-3500). Please verify.');
      return;
    }

    if (extractedData.fatMass && extractedData.weight && extractedData.fatMass >= extractedData.weight) {
      setError('Fat mass cannot be greater than or equal to total weight');
      return;
    }

    // Check if a scan with this date already exists
    const existingScan = checkExistingScan(extractedData.scanDate);
    if (existingScan) {
      setExistingScanDate(extractedData.scanDate);
      setShowOverwriteWarning(true);
      return;
    }

    // No existing scan, proceed to save
    saveScan();
  };

  const saveScan = () => {
    if (!extractedData) return;

    onAddScan({
      date: extractedData.scanDate,
      weight: extractedData.weight,
      bodyFatPercent: extractedData.bodyFatPercent,
      muscleMass: extractedData.muscleMass,
      skeletalMuscle: extractedData.skeletalMuscle,
      bmr: extractedData.bmr,
      fatMass: extractedData.fatMass,
      visceralFatGrade: extractedData.visceralFatGrade,
      waterWeight: extractedData.waterWeight,
      trunkFatMass: extractedData.trunkFatMass,
      bodyAge: extractedData.bodyAge,
      proteinMass: extractedData.proteinMass,
      boneMass: extractedData.boneMass,
      imageData: extractedData.imageData || undefined, // Don't save empty string
    });

    setExtractedData(null);
    setShowAdvanced(false);
    setIsManualEntry(false);
    setShowOverwriteWarning(false);
    setExistingScanDate(null);
  };

  const handleOverwriteConfirm = () => {
    saveScan();
  };

  const handleOverwriteCancel = () => {
    setShowOverwriteWarning(false);
    setExistingScanDate(null);
    // Keep the form open so user can change the date
  };

  const getVisceralFatStatus = (grade: number) => {
    if (grade < 10) return { text: 'Healthy range', color: '#10b981' };
    if (grade < 15) return { text: 'Elevated - monitor closely', color: '#f59e0b' };
    return { text: 'High risk - consult doctor', color: '#ef4444' };
  };

  return (
    <div className="inbody-upload">
      <div className="inbody-header">
        <h2>InBody Scans</h2>
        <p>Upload your InBody scan screenshots to track body composition</p>
      </div>

      {/* Upload Section */}
      <div className="card upload-card">
        <div className="upload-options">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !apiKey}
          >
            {isUploading ? (
              <>
                <Loader2 size={24} className="spin" />
                Analyzing scan...
              </>
            ) : (
              <>
                <Upload size={24} />
                Upload Screenshot
              </>
            )}
          </button>

          <span className="or-divider">or</span>

          <button
            className="manual-entry-btn"
            onClick={handleStartManualEntry}
            disabled={isUploading}
          >
            <Edit3 size={24} />
            Enter Manually
          </button>
        </div>

        {!apiKey && (
          <p className="api-warning">
            <AlertCircle size={16} />
            Add {aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings for screenshot analysis
          </p>
        )}
        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="card preview-card">
          <h3>{isManualEntry ? 'Enter InBody Data' : 'Extracted Data'}</h3>
          <p className="preview-note">
            {isManualEntry ? 'Fill in your InBody scan values' : 'Please verify and adjust if needed'}
          </p>

          {/* Basic Metrics */}
          <div className="preview-grid">
            <div className="preview-field">
              <label>Date</label>
              <input
                type="date"
                value={extractedData.scanDate}
                onChange={(e) =>
                  setExtractedData({ ...extractedData, scanDate: e.target.value })
                }
              />
            </div>
            <div className="preview-field">
              <label>Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={extractedData.weight}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    weight: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="preview-field">
              <label>Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={extractedData.bodyFatPercent}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    bodyFatPercent: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="preview-field">
              <label>Muscle Mass (kg)</label>
              <input
                type="number"
                step="0.1"
                value={extractedData.muscleMass}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    muscleMass: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="preview-field">
              <label>Skeletal Muscle (kg)</label>
              <input
                type="number"
                step="0.1"
                value={extractedData.skeletalMuscle}
                onChange={(e) =>
                  setExtractedData({
                    ...extractedData,
                    skeletalMuscle: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          {/* Enhanced Metrics Section */}
          <div className="enhanced-metrics-section">
            <div
              className="enhanced-metrics-header"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <h4>Enhanced Metrics</h4>
              <span className="toggle-icon">
                {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </span>
            </div>

            {showAdvanced && (
              <div className="enhanced-metrics-content">
                {/* Tier 1 - Critical Metrics */}
                <div className="metrics-tier">
                  <span className="tier-label">Critical for TDEE</span>

                  <div className="preview-field bmr-field">
                    <label>
                      BMR - Basal Metabolic Rate (kcal/day)
                    </label>
                    <input
                      type="number"
                      value={extractedData.bmr || ''}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          bmr: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g., 1616"
                    />
                    <span className="field-hint">Resting calories burned per day</span>
                  </div>

                  <div className="preview-field">
                    <label>Fat Mass (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={extractedData.fatMass || ''}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          fatMass: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g., 16.6"
                    />
                  </div>

                  <div className="preview-field">
                    <label>Visceral Fat Grade (1-20)</label>
                    <input
                      type="number"
                      value={extractedData.visceralFatGrade || ''}
                      onChange={(e) =>
                        setExtractedData({
                          ...extractedData,
                          visceralFatGrade: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="e.g., 6"
                      min="1"
                      max="20"
                    />
                    {extractedData.visceralFatGrade && (
                      <div
                        className="visceral-status"
                        style={{ color: getVisceralFatStatus(extractedData.visceralFatGrade).color }}
                      >
                        {extractedData.visceralFatGrade < 10 && '✅ '}
                        {extractedData.visceralFatGrade >= 10 && extractedData.visceralFatGrade < 15 && '⚠️ '}
                        {extractedData.visceralFatGrade >= 15 && '🚨 '}
                        {getVisceralFatStatus(extractedData.visceralFatGrade).text}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tier 2 - Additional Metrics */}
                <div className="metrics-tier tier-2">
                  <span className="tier-label">Additional Body Composition</span>

                  <div className="preview-grid">
                    <div className="preview-field">
                      <label>Water Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={extractedData.waterWeight || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            waterWeight: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 42.3"
                      />
                    </div>

                    <div className="preview-field">
                      <label>Trunk Fat Mass (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={extractedData.trunkFatMass || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            trunkFatMass: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 7.9"
                      />
                    </div>

                    <div className="preview-field">
                      <label>Body Age (years)</label>
                      <input
                        type="number"
                        value={extractedData.bodyAge || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            bodyAge: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 26"
                      />
                    </div>

                    <div className="preview-field">
                      <label>Protein Mass (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={extractedData.proteinMass || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            proteinMass: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 11.5"
                      />
                    </div>

                    <div className="preview-field">
                      <label>Bone Mass (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={extractedData.boneMass || ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            boneMass: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 3.9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="preview-actions">
            <button onClick={handleConfirmScan} className="confirm-btn">
              <Check size={16} />
              Save Scan
            </button>
            <button onClick={() => { setExtractedData(null); setShowAdvanced(false); setIsManualEntry(false); }} className="cancel-btn">
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scans History */}
      {scans.length > 0 && (
        <div className="card scans-history">
          <h3>Scan History</h3>
          <div className="scans-table">
            <div className="table-header">
              <span>Date</span>
              <span>Weight</span>
              <span>Body Fat</span>
              <span>Muscle</span>
              <span>BMR</span>
              <span></span>
            </div>
            {scans.map((scan) => (
              <div key={scan.id} className="table-row">
                <span>{format(parseISO(scan.date), 'MMM d, yyyy')}</span>
                <span>{scan.weight} kg</span>
                <span>{scan.bodyFatPercent}%</span>
                <span>{scan.muscleMass} kg</span>
                <span>{scan.bmr ? `${scan.bmr}` : '-'}</span>
                <button
                  className="delete-btn"
                  onClick={() => onDeleteScan(scan.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overwrite Warning Modal */}
      {showOverwriteWarning && existingScanDate && (
        <div className="modal-overlay">
          <div className="modal overwrite-warning-modal">
            <div className="modal-header warning">
              <AlertTriangle size={24} />
              <h3>Scan Already Exists</h3>
            </div>
            <div className="modal-body">
              <p>
                A scan for <strong>{format(parseISO(existingScanDate), 'MMMM d, yyyy')}</strong> already exists.
              </p>
              <p>Do you want to replace it with this new scan?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleOverwriteCancel}>
                Change Date
              </button>
              <button className="btn-danger" onClick={handleOverwriteConfirm}>
                Replace Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
