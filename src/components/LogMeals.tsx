import { useState } from 'react';
import { Utensils, Camera } from 'lucide-react';
import { MealLogger } from './MealLogger';
import { FoodScanner } from './FoodScanner';
import RecipeModal from './RecipeModal';
import type { Meal, DailyLog, MasterMeal, MealLogEntry, MasterMealLogEntry, QuantityUnit, AIProvider } from '../types';

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
  // Food scanner props
  aiProvider: AIProvider;
  openAiApiKey?: string;
  onLogScannedMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
  onSaveAndLogMeal: (meal: Omit<Meal, 'id' | 'isCustom'>, date: string) => void;
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
  aiProvider,
  openAiApiKey,
  onLogScannedMeal,
  onSaveAndLogMeal,
}: LogMealsProps) {
  const [recipeModalMeal, setRecipeModalMeal] = useState<Meal | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  return (
    <div className="log-meals-tab">
      <div className="card">
        <div className="card-header">
          <div className="card-header-left">
            <Utensils size={20} />
            <h3>Log Meals</h3>
          </div>
          <button className="scan-meal-btn" onClick={() => setShowScanner(true)}>
            <Camera size={18} />
            <span>Scan Meal</span>
          </button>
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

      {showScanner && (
        <FoodScanner
          aiProvider={aiProvider}
          openAiApiKey={openAiApiKey}
          groqApiKey={groqApiKey}
          onLogMeal={(meal) => onLogScannedMeal(meal, selectedDate)}
          onSaveAndLogMeal={(meal) => onSaveAndLogMeal(meal, selectedDate)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
