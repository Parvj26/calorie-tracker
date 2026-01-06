import React from 'react';
import { Plus, Check, ChefHat, Users } from 'lucide-react';
import type { MasterMeal } from '../../types';

interface MasterMealCardProps {
  meal: MasterMeal;
  onAddToLog: (mealId: string) => void;
  onViewRecipe?: (meal: MasterMeal) => void;
  isAddedToday: boolean;
}

export const MasterMealCard: React.FC<MasterMealCardProps> = ({
  meal,
  onAddToLog,
  onViewRecipe,
  isAddedToday,
}) => {
  return (
    <div className={`master-meal-card ${isAddedToday ? 'added-today' : ''}`}>
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
              <ChefHat size={14} />
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

        <button
          className={`add-to-log-btn ${isAddedToday ? 'added' : ''}`}
          onClick={() => onAddToLog(meal.id)}
          disabled={isAddedToday}
        >
          {isAddedToday ? (
            <>
              <Check size={16} />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus size={16} />
              <span>Add to Today</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
