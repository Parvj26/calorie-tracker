import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Minus, Trash2, Check, X, ChevronLeft, ChevronRight, Search, ChefHat, Star, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, Pencil, Globe } from 'lucide-react';
import type { Meal, DailyLog, MasterMeal, MealLogEntry, MasterMealLogEntry, QuantityUnit } from '../types';
import { groqFormatRecipeText } from '../utils/groq';

// Combined meal type for display (personal or community)
interface DisplayMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  recipe?: Meal['recipe'];
  isCustom?: boolean;
  favorite?: boolean;
  isCommunity: boolean;
  isInLibrary?: boolean; // For community meals: true if in library, false if only logged on this day
  servingSize?: number;
  servingSizeUnit?: 'g' | 'ml' | 'oz';
}

interface MealLoggerProps {
  meals: Meal[];
  deletedMeals: Meal[];
  dailyLogs: DailyLog[];
  selectedDate: string;
  log: DailyLog;
  // Community meals (saved to library OR logged for current day)
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
  onOpenRecipe: (meal: Meal) => void;
  groqApiKey?: string;
}

export const MealLogger: React.FC<MealLoggerProps> = ({
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
  onOpenRecipe,
  groqApiKey,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);
  const [isTrashExpanded, setIsTrashExpanded] = useState(false);
  const [mealToPermDelete, setMealToPermDelete] = useState<Meal | null>(null);
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    servingSize: '',
  });
  const [recipeText, setRecipeText] = useState('');
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isFormattingRecipe, setIsFormattingRecipe] = useState(false);

  // Start editing a meal
  const startEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setNewMeal({
      name: meal.name,
      calories: meal.calories.toString(),
      protein: meal.protein.toString(),
      carbs: meal.carbs.toString(),
      fat: meal.fat.toString(),
      fiber: meal.fiber?.toString() || '',
      sugar: meal.sugar?.toString() || '',
      servingSize: meal.servingSize?.toString() || '',
    });
    setRecipeText(meal.recipe?.rawText || '');
    setShowAddForm(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingMeal(null);
    setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', servingSize: '' });
    setRecipeText('');
    setRecipeError(null);
    setShowAddForm(false);
  };

  // Combine personal meals with community meals (saved to library OR logged for current day)
  const allDisplayMeals = useMemo((): DisplayMeal[] => {
    const personalMeals: DisplayMeal[] = meals.map(m => ({
      ...m,
      fiber: m.fiber || 0,
      sugar: m.sugar || 0,
      isCommunity: false,
      servingSize: m.servingSize,
      servingSizeUnit: m.servingSizeUnit,
    }));

    const communityMeals: DisplayMeal[] = displayMasterMeals.map(m => ({
      id: m.id,
      name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber || 0,
      sugar: m.sugar || 0,
      recipe: m.recipe,
      isCommunity: true,
      isInLibrary: savedMasterMealIds.includes(m.id),
      servingSize: m.servingSize,
      servingSizeUnit: m.servingSizeUnit,
    }));

    return [...personalMeals, ...communityMeals];
  }, [meals, displayMasterMeals, savedMasterMealIds]);

  // Filter meals based on search query
  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return allDisplayMeals;
    const query = searchQuery.toLowerCase();
    return allDisplayMeals.filter(meal =>
      meal.name.toLowerCase().includes(query)
    );
  }, [allDisplayMeals, searchQuery]);

  // Sort meals: favorites first, then by recent usage, then alphabetically
  const sortedMeals = useMemo(() => {
    // Helper: get most recent date a meal was used (for personal meals)
    const getLastUsedDate = (mealId: string, isCommunity: boolean): string | null => {
      if (isCommunity) {
        const logsWithMeal = dailyLogs
          .filter(log => log.masterMealIds?.includes(mealId))
          .sort((a, b) => b.date.localeCompare(a.date));
        return logsWithMeal[0]?.date || null;
      } else {
        const logsWithMeal = dailyLogs
          .filter(log => log.meals.includes(mealId))
          .sort((a, b) => b.date.localeCompare(a.date));
        return logsWithMeal[0]?.date || null;
      }
    };

    return [...filteredMeals].sort((a, b) => {
      // 1. Favorites first (only personal meals have favorites)
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      // 2. Recently used
      const aDate = getLastUsedDate(a.id, a.isCommunity);
      const bDate = getLastUsedDate(b.id, b.isCommunity);
      if (aDate && bDate) return bDate.localeCompare(aDate);
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;

      // 3. Alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [filteredMeals, dailyLogs]);

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeal.name || !newMeal.calories) return;

    let formattedRecipe = undefined;
    const trimmedRecipeText = recipeText.trim();
    if (trimmedRecipeText) {
      if (!groqApiKey) {
        setRecipeError('Add your Groq API key in Settings to format recipes.');
        return;
      }
      setIsFormattingRecipe(true);
      setRecipeError(null);
      try {
        formattedRecipe = await groqFormatRecipeText(trimmedRecipeText, groqApiKey);
      } catch (error) {
        setRecipeError((error as Error).message || 'Failed to format recipe. Try again.');
        setIsFormattingRecipe(false);
        return;
      }
      setIsFormattingRecipe(false);
    }

    const servingSizeValue = parseInt(newMeal.servingSize);
    const mealData = {
      name: newMeal.name,
      calories: parseInt(newMeal.calories) || 0,
      protein: parseInt(newMeal.protein) || 0,
      carbs: parseInt(newMeal.carbs) || 0,
      fat: parseInt(newMeal.fat) || 0,
      fiber: parseInt(newMeal.fiber) || 0,
      sugar: parseInt(newMeal.sugar) || 0,
      recipe: formattedRecipe || undefined,
      servingSize: servingSizeValue > 0 ? servingSizeValue : undefined,
      servingSizeUnit: servingSizeValue > 0 ? ('g' as const) : undefined,
    };

    if (editingMeal) {
      // Update existing meal
      onUpdateMeal(editingMeal.id, mealData);
    } else {
      // Add new meal
      onAddMeal(mealData);
    }

    cancelEdit();
  };

  const changeDate = (days: number) => {
    const current = parseISO(selectedDate);
    current.setDate(current.getDate() + days);
    onDateChange(format(current, 'yyyy-MM-dd'));
  };

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="meal-logger">
      <div className="date-selector">
        <button onClick={() => changeDate(-1)} className="date-btn">
          <ChevronLeft size={20} />
        </button>
        <div className="date-display">
          <span className="date-label">
            {isToday ? 'Today' : format(parseISO(selectedDate), 'EEEE')}
          </span>
          <span className="date-value">{format(parseISO(selectedDate), 'MMM d, yyyy')}</span>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="date-btn"
          disabled={isToday}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="meal-list">
        <h3>Select meals eaten</h3>

        <div className="meal-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search meals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {sortedMeals.length === 0 && searchQuery && (
          <div className="no-meals-found">
            No meals found for "{searchQuery}"
          </div>
        )}

        {sortedMeals.map((meal) => {
          // Find the meal entry in the log to get quantity and unit
          const mealEntry = meal.isCommunity
            ? log.masterMealIds?.find((entry) => getMasterMealId(entry) === meal.id)
            : log.meals.find((entry) => getMealId(entry) === meal.id);

          const isSelected = !!mealEntry;
          const quantity = mealEntry
            ? (meal.isCommunity ? getMasterMealQuantity(mealEntry) : getMealQuantity(mealEntry))
            : 1;
          const unit: QuantityUnit = mealEntry
            ? (meal.isCommunity ? getMasterMealUnit(mealEntry) : getMealUnit(mealEntry))
            : 'serving';

          // Check if meal supports gram-based quantities
          const supportsGrams = !!meal.servingSize;

          const handleToggle = () => {
            if (meal.isCommunity) {
              onToggleMasterMeal(meal.id, selectedDate);
            } else {
              onToggleMeal(meal.id, selectedDate);
            }
          };

          const handleQuantityChange = (delta: number) => {
            // Different limits based on unit
            const maxVal = unit === 'serving' ? 10 : 1000;
            const minVal = unit === 'serving' ? 0.5 : 1;
            const newQuantity = Math.max(minVal, Math.min(maxVal, quantity + delta));
            if (meal.isCommunity) {
              onUpdateMasterMealQuantity(meal.id, selectedDate, newQuantity, unit);
            } else {
              onUpdateMealQuantity(meal.id, selectedDate, newQuantity, unit);
            }
          };

          const handleUnitChange = (newUnit: QuantityUnit) => {
            // Convert quantity when switching units
            let newQuantity = quantity;
            if (unit === 'serving' && newUnit === 'g') {
              // Convert servings to grams
              newQuantity = Math.round(quantity * (meal.servingSize || 100));
            } else if (unit === 'g' && newUnit === 'serving') {
              // Convert grams to servings
              newQuantity = Math.round((quantity / (meal.servingSize || 100)) * 10) / 10;
              newQuantity = Math.max(0.5, newQuantity);
            }
            if (meal.isCommunity) {
              onUpdateMasterMealQuantity(meal.id, selectedDate, newQuantity, newUnit);
            } else {
              onUpdateMealQuantity(meal.id, selectedDate, newQuantity, newUnit);
            }
          };

          const handleQuantityInput = (value: string) => {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
              if (meal.isCommunity) {
                onUpdateMasterMealQuantity(meal.id, selectedDate, numValue, unit);
              } else {
                onUpdateMealQuantity(meal.id, selectedDate, numValue, unit);
              }
            }
          };

          // Calculate displayed macros based on quantity and unit
          const servingMultiplier = getServingMultiplier(quantity, unit, meal.servingSize);
          const displayCalories = Math.round(meal.calories * servingMultiplier);
          const displayProtein = Math.round(meal.protein * servingMultiplier);
          const displayCarbs = Math.round(meal.carbs * servingMultiplier);
          const displayFat = Math.round(meal.fat * servingMultiplier);

          return (
            <div
              key={`${meal.isCommunity ? 'community' : 'personal'}-${meal.id}`}
              className={`meal-item ${isSelected ? 'selected' : ''}`}
              onClick={handleToggle}
            >
              <div className="meal-checkbox">
                {isSelected && <Check size={16} />}
              </div>
              <div className="meal-info">
                <span className="meal-name">
                  {meal.name}
                  {meal.isCommunity && (
                    <span className="community-badge" title="Community meal">
                      <Globe size={12} />
                      Community
                    </span>
                  )}
                  {meal.recipe && (
                    <button
                      type="button"
                      className="recipe-indicator"
                      title="View recipe"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenRecipe(meal as Meal);
                      }}
                    >
                      <ChefHat size={16} />
                      <span>Recipe</span>
                    </button>
                  )}
                </span>
                <span className="meal-macros">
                  {isSelected && quantity !== 1 ? (
                    <>{displayCalories} cal • {displayProtein}g P • {displayCarbs}g C • {displayFat}g F</>
                  ) : (
                    <>{meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F</>
                  )}
                </span>
              </div>
              {/* Quantity controls - show when selected */}
              {isSelected && (
                <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
                  {supportsGrams && unit === 'g' ? (
                    // Gram input mode
                    <input
                      type="number"
                      className="quantity-input"
                      value={quantity}
                      onChange={(e) => handleQuantityInput(e.target.value)}
                      min="1"
                      max="2000"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    // Serving mode with +/- buttons
                    <>
                      <button
                        className="quantity-btn"
                        onClick={() => handleQuantityChange(-0.5)}
                        title="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="quantity-value">{quantity}</span>
                      <button
                        className="quantity-btn"
                        onClick={() => handleQuantityChange(0.5)}
                        title="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </>
                  )}
                  {supportsGrams && (
                    <select
                      className="unit-select"
                      value={unit}
                      onChange={(e) => handleUnitChange(e.target.value as QuantityUnit)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="serving">serving</option>
                      <option value="g">g</option>
                    </select>
                  )}
                </div>
              )}
              <div className="meal-actions">
                {!meal.isCommunity ? (
                  <>
                    <button
                      className={`favorite-btn ${meal.favorite ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(meal.id);
                      }}
                      title={meal.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star size={16} fill={meal.favorite ? 'currentColor' : 'none'} />
                    </button>
                    {meal.isCustom && (
                      <>
                        <button
                          className="edit-meal-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditMeal(meal as Meal);
                          }}
                          title="Edit meal"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="delete-meal-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMealToDelete(meal as Meal);
                          }}
                          title="Move to trash"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </>
                ) : meal.isInLibrary && (
                  <button
                    className="remove-from-library-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromLibrary(meal.id);
                    }}
                    title="Remove from library"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showAddForm ? (
        <button className="add-meal-btn" onClick={() => setShowAddForm(true)}>
          <Plus size={20} />
          Add Custom Meal
        </button>
      ) : (
        <form className="add-meal-form" onSubmit={handleAddMeal}>
          <div className="form-header">
            <h4>{editingMeal ? 'Edit Meal' : 'Add Custom Meal'}</h4>
            <button type="button" onClick={cancelEdit}>
              <X size={20} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Meal name"
            value={newMeal.name}
            onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
            required
          />
          <div className="macro-inputs">
            <input
              type="number"
              placeholder="Calories"
              value={newMeal.calories}
              onChange={(e) => setNewMeal({ ...newMeal, calories: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Protein (g)"
              value={newMeal.protein}
              onChange={(e) => setNewMeal({ ...newMeal, protein: e.target.value })}
            />
            <input
              type="number"
              placeholder="Carbs (g)"
              value={newMeal.carbs}
              onChange={(e) => setNewMeal({ ...newMeal, carbs: e.target.value })}
            />
            <input
              type="number"
              placeholder="Fat (g)"
              value={newMeal.fat}
              onChange={(e) => setNewMeal({ ...newMeal, fat: e.target.value })}
            />
            <input
              type="number"
              placeholder="Fiber (g)"
              value={newMeal.fiber}
              onChange={(e) => setNewMeal({ ...newMeal, fiber: e.target.value })}
            />
            <input
              type="number"
              placeholder="Sugar (g)"
              value={newMeal.sugar}
              onChange={(e) => setNewMeal({ ...newMeal, sugar: e.target.value })}
            />
          </div>
          <div className="serving-size-input">
            <label>
              <span>Serving size (optional)</span>
              <div className="serving-size-row">
                <input
                  type="number"
                  placeholder="e.g., 100"
                  value={newMeal.servingSize}
                  onChange={(e) => setNewMeal({ ...newMeal, servingSize: e.target.value })}
                  min="1"
                />
                <span className="serving-size-unit">grams</span>
              </div>
              <span className="serving-size-hint">Set to enable gram-based logging</span>
            </label>
          </div>
          <details className="recipe-editor">
            <summary>Add Recipe (Optional)</summary>
            <div className="recipe-form">
              <label htmlFor="recipe-text">Recipe & Ingredients</label>
              <textarea
                id="recipe-text"
                className="recipe-textarea"
                placeholder="Paste ingredients and steps here. We'll format it for you."
                value={recipeText}
                onChange={(e) => {
                  setRecipeText(e.target.value);
                  if (recipeError) setRecipeError(null);
                }}
                rows={6}
              />
              {recipeError && <div className="recipe-error">{recipeError}</div>}
              <div className="recipe-hint">
                Tip: Include sections like Base, Toppings, Dressing, and any nutrition notes.
              </div>
            </div>
          </details>
          <button type="submit" className="submit-btn" disabled={isFormattingRecipe}>
            {isFormattingRecipe ? 'Formatting Recipe...' : editingMeal ? 'Update Meal' : 'Add Meal'}
          </button>
        </form>
      )}

      {/* Trash Section */}
      {deletedMeals.length > 0 && (
        <div className="trash-section">
          <button
            className="trash-header"
            onClick={() => setIsTrashExpanded(!isTrashExpanded)}
          >
            <div className="trash-header-left">
              <Trash2 size={18} />
              <span>Trash ({deletedMeals.length})</span>
            </div>
            {isTrashExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {isTrashExpanded && (
            <div className="trash-content">
              <p className="trash-info">
                Deleted meals are permanently removed after 30 days.
                Restoring adds the meal back to your library only.
              </p>

              {deletedMeals.map((meal) => {
                const daysLeft = getDaysUntilExpiry(meal.deletedAt!);
                return (
                  <div key={meal.id} className="trash-item">
                    <div className="trash-item-info">
                      <span className="meal-name">{meal.name}</span>
                      <span className="meal-macros">
                        {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                      </span>
                      <span className={`expiry-badge ${daysLeft <= 7 ? 'expiring-soon' : ''}`}>
                        {daysLeft <= 0 ? 'Expiring today' : `${daysLeft} days left`}
                      </span>
                    </div>
                    <div className="trash-item-actions">
                      <button
                        className="restore-btn"
                        onClick={() => onRestoreMeal(meal.id)}
                        title="Restore to library"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        className="perm-delete-btn"
                        onClick={() => setMealToPermDelete(meal)}
                        title="Delete permanently"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Move to Trash Confirmation */}
      {mealToDelete && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <h4>Move to Trash?</h4>
            <p>Move "{mealToDelete.name}" to trash?</p>
            <p className="delete-info">It will be removed from all logged days but can be restored within 30 days.</p>
            <div className="delete-confirm-actions">
              <button className="btn-secondary" onClick={() => setMealToDelete(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => {
                onDeleteMeal(mealToDelete.id);
                setMealToDelete(null);
              }}>
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {mealToPermDelete && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <AlertTriangle size={48} className="warning-icon" />
            <h4>Permanently Delete?</h4>
            <p>Delete "{mealToPermDelete.name}" forever?</p>
            <p className="delete-warning">This cannot be undone.</p>
            <div className="delete-confirm-actions">
              <button className="btn-secondary" onClick={() => setMealToPermDelete(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => {
                onPermanentDeleteMeal(mealToPermDelete.id);
                setMealToPermDelete(null);
              }}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
