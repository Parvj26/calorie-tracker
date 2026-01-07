import React, { useState, useMemo } from 'react';
import { X, Upload, Check, AlertTriangle } from 'lucide-react';
import type { Meal, MealSubmission } from '../../types';

interface SubmitMealModalProps {
  meals: Meal[];
  submissions: MealSubmission[];
  checkDuplicateName: (name: string) => boolean;
  onSubmit: (meal: Meal) => Promise<boolean>;
  onClose: () => void;
}

export const SubmitMealModal: React.FC<SubmitMealModalProps> = ({
  meals,
  submissions,
  checkDuplicateName,
  onSubmit,
  onClose,
}) => {
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedMeal = meals.find((m) => m.id === selectedMealId);

  // Get IDs of meals that already have a pending or approved submission
  const submittedMealIds = useMemo(() => {
    return new Set(
      submissions
        .filter((s) => s.status === 'pending' || s.status === 'approved')
        .map((s) => s.sourceMealId)
        .filter(Boolean)
    );
  }, [submissions]);

  // Check if selected meal name is a duplicate
  const isDuplicateName = useMemo(() => {
    if (!selectedMeal) return false;
    return checkDuplicateName(selectedMeal.name);
  }, [selectedMeal, checkDuplicateName]);

  const handleSubmit = async () => {
    if (!selectedMeal) return;

    // Warn about duplicate name
    if (isDuplicateName) {
      if (!window.confirm(
        `A meal named "${selectedMeal.name}" already exists in the community library. ` +
        `Are you sure you want to submit anyway? The admin may reject it as a duplicate.`
      )) {
        return;
      }
    }

    setIsSubmitting(true);
    const success = await onSubmit(selectedMeal);
    setIsSubmitting(false);

    if (success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  // Filter to only show custom meals (not deleted) that haven't been submitted
  const customMeals = meals.filter(
    (m) => m.isCustom && !m.deletedAt && !submittedMealIds.has(m.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content submit-meal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Submit Meal to Community</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {submitSuccess ? (
          <div className="submit-success">
            <Check size={48} className="success-icon" />
            <h4>Meal Submitted!</h4>
            <p>Your meal is pending admin review.</p>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <p className="submit-info">
                Select a meal from your library to submit for community review.
                Once approved by an admin, it will be available for all users.
              </p>

              {customMeals.length === 0 ? (
                <div className="no-meals-message">
                  <p>You don't have any custom meals to submit.</p>
                  <p>Create a custom meal first in the Dashboard.</p>
                </div>
              ) : (
                <div className="meal-select-list">
                  {customMeals.map((meal) => (
                    <div
                      key={meal.id}
                      className={`meal-select-item ${selectedMealId === meal.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMealId(meal.id)}
                    >
                      <div className="meal-select-checkbox">
                        {selectedMealId === meal.id && <Check size={16} />}
                      </div>
                      <div className="meal-select-info">
                        <span className="meal-select-name">{meal.name}</span>
                        <span className="meal-select-macros">
                          {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedMeal && (
                <div className="selected-meal-preview">
                  <h4>Selected Meal Preview</h4>
                  <div className="preview-details">
                    <p><strong>{selectedMeal.name}</strong></p>
                    <p>{selectedMeal.calories} calories</p>
                    <p>Protein: {selectedMeal.protein}g | Carbs: {selectedMeal.carbs}g | Fat: {selectedMeal.fat}g</p>
                    {selectedMeal.recipe && <p className="has-recipe">Includes recipe</p>}
                  </div>
                  {isDuplicateName && (
                    <div className="duplicate-warning">
                      <AlertTriangle size={16} />
                      <span>A meal with this name already exists in the community library</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!selectedMeal || isSubmitting}
              >
                {isSubmitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Upload size={16} />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
