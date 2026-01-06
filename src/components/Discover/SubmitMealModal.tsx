import React, { useState } from 'react';
import { X, Upload, Check } from 'lucide-react';
import type { Meal } from '../../types';

interface SubmitMealModalProps {
  meals: Meal[];
  onSubmit: (meal: Meal) => Promise<boolean>;
  onClose: () => void;
}

export const SubmitMealModal: React.FC<SubmitMealModalProps> = ({
  meals,
  onSubmit,
  onClose,
}) => {
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const selectedMeal = meals.find((m) => m.id === selectedMealId);

  const handleSubmit = async () => {
    if (!selectedMeal) return;

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

  // Filter to only show custom meals (not deleted)
  const customMeals = meals.filter((m) => m.isCustom && !m.deletedAt);

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
