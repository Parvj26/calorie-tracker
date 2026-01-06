import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Upload, Loader2, Check, AlertCircle, Trash2, X } from 'lucide-react';
import type { InBodyScan, AIProvider } from '../types';
import { extractInBodyData } from '../utils/openai';
import { groqExtractInBodyData } from '../utils/groq';

interface InBodyUploadProps {
  scans: InBodyScan[];
  aiProvider: AIProvider;
  openAiApiKey?: string;
  groqApiKey?: string;
  onAddScan: (scan: Omit<InBodyScan, 'id'>) => void;
  onDeleteScan: (id: string) => void;
}

export const InBodyUpload: React.FC<InBodyUploadProps> = ({
  scans,
  aiProvider,
  openAiApiKey,
  groqApiKey,
  onAddScan,
  onDeleteScan,
}) => {
  const apiKey = aiProvider === 'groq' ? groqApiKey : openAiApiKey;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    weight: number;
    bodyFatPercent: number;
    muscleMass: number;
    skeletalMuscle: number;
    scanDate: string;
    imageData: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            data = await groqExtractInBodyData(base64, apiKey);
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
          });
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

    onAddScan({
      date: extractedData.scanDate,
      weight: extractedData.weight,
      bodyFatPercent: extractedData.bodyFatPercent,
      muscleMass: extractedData.muscleMass,
      skeletalMuscle: extractedData.skeletalMuscle,
      imageData: extractedData.imageData,
    });

    setExtractedData(null);
  };

  return (
    <div className="inbody-upload">
      <div className="inbody-header">
        <h2>InBody Scans</h2>
        <p>Upload your InBody scan screenshots to track body composition</p>
      </div>

      {/* Upload Section */}
      <div className="card upload-card">
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
              Upload InBody Screenshot
            </>
          )}
        </button>
        {!apiKey && (
          <p className="api-warning">
            <AlertCircle size={16} />
            Add {aiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key in Settings first
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
          <h3>Extracted Data</h3>
          <p className="preview-note">Please verify and adjust if needed</p>
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
          <div className="preview-actions">
            <button onClick={handleConfirmScan} className="confirm-btn">
              <Check size={16} />
              Save Scan
            </button>
            <button onClick={() => setExtractedData(null)} className="cancel-btn">
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
              <span>SMM</span>
              <span></span>
            </div>
            {scans.map((scan) => (
              <div key={scan.id} className="table-row">
                <span>{format(new Date(scan.date), 'MMM d, yyyy')}</span>
                <span>{scan.weight} kg</span>
                <span>{scan.bodyFatPercent}%</span>
                <span>{scan.muscleMass} kg</span>
                <span>{scan.skeletalMuscle} kg</span>
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
    </div>
  );
};
