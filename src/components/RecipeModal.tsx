import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { Meal, RecipeIngredient, RecipeSection } from '../types';

interface RecipeModalProps {
  meal: Meal;
  onClose: () => void;
  onLogMeal?: () => void;
}

export default function RecipeModal({ meal, onClose, onLogMeal }: RecipeModalProps) {
  if (!meal.recipe) return null;

  const { ingredients, instructions, servings, totalTime, nutrition, sections } = meal.recipe;
  const summaryNutrition = nutrition || {
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    fiber: meal.fiber,
    sugar: meal.sugar,
  };
  const fallbackSections: RecipeSection[] = ingredients && ingredients.length > 0
    ? [{ title: 'Ingredients', ingredients }]
    : [];

  const formatPortion = (ingredient: RecipeIngredient) => {
    if (!ingredient) return '';
    if ('portion' in ingredient && ingredient.portion) return ingredient.portion;
    const amount = 'amount' in ingredient ? ingredient.amount : undefined;
    const unit = 'unit' in ingredient ? ingredient.unit : undefined;
    if (amount && unit) return `${amount} ${unit}`;
    if (amount) return amount;
    return '';
  };

  const hasNutrition = (value?: { calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; fiber?: number | null; sugar?: number | null }) => {
    if (!value) return false;
    return [value.calories, value.protein, value.carbs, value.fat, value.fiber, value.sugar].some((entry) => typeof entry === 'number');
  };

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{meal.name}</h2>
          <button onClick={onClose} className="close-button">
            <X size={24} />
          </button>
        </div>

        <div className="recipe-body">
          <div className="nutrition-summary">
            <div className="nutrition-item">
              <span className="label">Calories</span>
              <span className="value">{summaryNutrition.calories ?? meal.calories}</span>
            </div>
            <div className="nutrition-item">
              <span className="label">Protein</span>
              <span className="value">{summaryNutrition.protein ?? meal.protein}g</span>
            </div>
            <div className="nutrition-item">
              <span className="label">Carbs</span>
              <span className="value">{summaryNutrition.carbs ?? meal.carbs}g</span>
            </div>
            <div className="nutrition-item">
              <span className="label">Fat</span>
              <span className="value">{summaryNutrition.fat ?? meal.fat}g</span>
            </div>
            <div className="nutrition-item fiber">
              <span className="label">Fiber</span>
              <span className="value">{summaryNutrition.fiber ?? meal.fiber ?? 0}g</span>
            </div>
            <div className="nutrition-item sugar">
              <span className="label">Sugar</span>
              <span className="value">{summaryNutrition.sugar ?? meal.sugar ?? 0}g</span>
            </div>
          </div>

          <div className="recipe-info">
            <span>Servings: {servings}</span>
            {totalTime && <span>Time: {totalTime} min</span>}
          </div>

          {(sections && sections.length > 0 ? sections : fallbackSections).map((section: RecipeSection, sectionIndex: number) => (
            <div className="recipe-section" key={`${section.title}-${sectionIndex}`}>
              <div className="section-header">
                <h3>{section.title}</h3>
                {hasNutrition(section.nutrition) && (
                  <div className="section-nutrition-container">
                    <span className="section-nutrition">
                      {(section.nutrition?.calories ?? 0)} cal · {(section.nutrition?.protein ?? 0)}g P · {(section.nutrition?.carbs ?? 0)}g C · {(section.nutrition?.fat ?? 0)}g F
                    </span>
                    <span className="section-nutrition secondary">
                      {(section.nutrition?.fiber ?? 0)}g fiber · {(section.nutrition?.sugar ?? 0)}g sugar
                    </span>
                  </div>
                )}
              </div>
              <ul className="ingredients-list">
                {section.ingredients.map((ingredient, index) => (
                  <li key={`${sectionIndex}-${index}`}>
                    <span className="ingredient-amount">{formatPortion(ingredient)}</span>
                    <span className="ingredient-item">{ingredient.item}</span>
                  </li>
                ))}
              </ul>
              {section.notes && section.notes.length > 0 && (
                <div className="section-notes">
                  {section.notes.map((note: string, index: number) => (
                    <div key={`${sectionIndex}-note-${index}`}>{note}</div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {instructions && instructions.length > 0 && (
            <div className="recipe-section">
              <h3>Instructions</h3>
              <ol className="instructions-list">
                {instructions.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {onLogMeal && (
            <button onClick={onLogMeal} className="btn btn-primary">
              Log This Meal
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
