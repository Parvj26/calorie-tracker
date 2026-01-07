import { useState } from 'react';
import { Utensils } from 'lucide-react';
import { MealLogger } from './MealLogger';
import RecipeModal from './RecipeModal';
import type { Meal, DailyLog, MasterMeal, MealLogEntry, MasterMealLogEntry, QuantityUnit } from '../types';

interface LogMealsProps {
  meals: Meal[];
  deletedMeals: Meal[];
  dailyLogs: DailyLog[];
  selectedDate: string;
  log: DailyLog;
  displayMasterMeals: MasterMeal[];
  savedMasterMealIds: string[];
  onToggleMeal: (mealId: string, date: string) => void;
  onToggleMasterMeal: (masterMealId: string, date: string) => void;
  onUpdateMealQuantity: (mealId: string, date: string, quantity: number, unit?: QuantityUnit) => void;
  onUpdateMasterMealQuantity: (masterMealId: string, date: string, quantity: number, unit?: QuantityUnit) => void;
  getMealId: (entry: string | MealLogEntry) => string;
  getMealQuantity: (entry: string | MealLogEntry) => number;
  getMealUnit: (entry: string | MealLogEntry) => QuantityUnit;
  getMasterMealId: (entry: string | MasterMealLogEntry) => string;
  getMasterMealQuantity: (entry: string | MasterMealLogEntry) => number;
  getMasterMealUnit: (entry: string | MasterMealLogEntry) => QuantityUnit;
  getServingMultiplier: (quantity: number, unit: QuantityUnit, servingSize?: number) => number;
  onRemoveFromLibrary: (masterMealId: string) => void;
  onAddMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onUpdateMeal: (id: string, updates: Partial<Meal>) => void;
  onDeleteMeal: (mealId: string) => void;
  onRestoreMeal: (mealId: string) => void;
  onPermanentDeleteMeal: (mealId: string) => void;
  getDaysUntilExpiry: (deletedAt: string) => number;
  onToggleFavorite: (mealId: string) => void;
  onDateChange: (date: string) => void;
  groqApiKey?: string;
}

export function LogMeals({
  meals,
  deletedMeals,
  dailyLogs,
  selectedDate,
  log,
  displayMasterMeals,
  savedMasterMealIds,
  onToggleMeal,
  onToggleMasterMeal,
  onUpdateMealQuantity,
  onUpdateMasterMealQuantity,
  getMealId,
  getMealQuantity,
  getMealUnit,
  getMasterMealId,
  getMasterMealQuantity,
  getMasterMealUnit,
  getServingMultiplier,
  onRemoveFromLibrary,
  onAddMeal,
  onUpdateMeal,
  onDeleteMeal,
  onRestoreMeal,
  onPermanentDeleteMeal,
  getDaysUntilExpiry,
  onToggleFavorite,
  onDateChange,
  groqApiKey,
}: LogMealsProps) {
  const [recipeModalMeal, setRecipeModalMeal] = useState<Meal | null>(null);

  return (
    <div className="log-meals-tab">
      <div className="card">
        <div className="card-header">
          <Utensils size={20} />
          <h3>Log Meals</h3>
        </div>
        <MealLogger
          meals={meals}
          deletedMeals={deletedMeals}
          dailyLogs={dailyLogs}
          selectedDate={selectedDate}
          log={log}
          displayMasterMeals={displayMasterMeals}
          savedMasterMealIds={savedMasterMealIds}
          onToggleMeal={onToggleMeal}
          onToggleMasterMeal={onToggleMasterMeal}
          onUpdateMealQuantity={onUpdateMealQuantity}
          onUpdateMasterMealQuantity={onUpdateMasterMealQuantity}
          getMealId={getMealId}
          getMealQuantity={getMealQuantity}
          getMealUnit={getMealUnit}
          getMasterMealId={getMasterMealId}
          getMasterMealQuantity={getMasterMealQuantity}
          getMasterMealUnit={getMasterMealUnit}
          getServingMultiplier={getServingMultiplier}
          onRemoveFromLibrary={onRemoveFromLibrary}
          onAddMeal={onAddMeal}
          onUpdateMeal={onUpdateMeal}
          onDeleteMeal={onDeleteMeal}
          onRestoreMeal={onRestoreMeal}
          onPermanentDeleteMeal={onPermanentDeleteMeal}
          getDaysUntilExpiry={getDaysUntilExpiry}
          onToggleFavorite={onToggleFavorite}
          onDateChange={onDateChange}
          onOpenRecipe={(meal) => setRecipeModalMeal(meal)}
          groqApiKey={groqApiKey}
        />
      </div>

      {recipeModalMeal && (
        <RecipeModal
          meal={recipeModalMeal}
          onClose={() => setRecipeModalMeal(null)}
        />
      )}
    </div>
  );
}
