import React, { useState } from 'react';
import { Check, ChefHat, Users, Library, Trash2, Loader2 } from 'lucide-react';
import type { MasterMeal } from '../../types';

interface MasterMealCardProps {
  meal: MasterMeal;
  onAddToLibrary: (mealId: string) => void;
  onViewRecipe?: (meal: MasterMeal) => void;
  isSaved: boolean;
  isAdmin?: boolean;
  onDelete?: (mealId: string) => Promise<boolean>;
}

export const MasterMealCard: React.FC<MasterMealCardProps> = ({
  meal,
  onAddToLibrary,
  onViewRecipe,
  isSaved,
  isAdmin,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || !window.confirm(`Are you sure you want to remove "${meal.name}" from community meals?`)) {
      return;
    }
    setIsDeleting(true);
    await onDelete(meal.id);
    setIsDeleting(false);
  };
  return (
    <div className={`master-meal-card ${isSaved ? 'saved' : ''}`}>
      <div className="master-meal-header">
        <h4 className="master-meal-name">
          {meal.name}
          {meal.recipe && (
            <button
              type="button"
              className="recipe-indicator"
              title="View recipe"
              onClick={(e) => {
                e.stopPropagation();
                onViewRecipe?.(meal);
              }}
            >
              <ChefHat size={16} />
              <span>Recipe</span>
            </button>
          )}
        </h4>
        {meal.submittedByName && (
          <span className="master-meal-author">by {meal.submittedByName}</span>
        )}
      </div>

      <div className="master-meal-macros">
        <span className="macro-item calories">{meal.calories} cal</span>
        <span className="macro-item">{meal.protein}g P</span>
        <span className="macro-item">{meal.carbs}g C</span>
        <span className="macro-item">{meal.fat}g F</span>
      </div>

      <div className="master-meal-footer">
        <div className="usage-count" title={`Used ${meal.usageCount} times`}>
          <Users size={14} />
          <span>{meal.usageCount}</span>
        </div>

        <div className="master-meal-actions">
          {isAdmin && onDelete && (
            <button
              className="delete-master-meal-btn"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Remove from community"
            >
              {isDeleting ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
            </button>
          )}

          <button
            className={`add-to-library-btn ${isSaved ? 'saved' : ''}`}
            onClick={() => onAddToLibrary(meal.id)}
            disabled={isSaved}
          >
            {isSaved ? (
              <>
                <Check size={16} />
                <span>In Library</span>
              </>
            ) : (
              <>
                <Library size={16} />
                <span>Add to Library</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
