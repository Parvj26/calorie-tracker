import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight, Search, ChefHat, Star } from 'lucide-react';
import type { Meal, DailyLog } from '../types';
import { groqFormatRecipeText } from '../utils/groq';

interface MealLoggerProps {
  meals: Meal[];
  dailyLogs: DailyLog[];
  selectedDate: string;
  log: DailyLog;
  onToggleMeal: (mealId: string, date: string) => void;
  onAddMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onToggleFavorite: (mealId: string) => void;
  onDateChange: (date: string) => void;
  onOpenRecipe: (meal: Meal) => void;
  groqApiKey?: string;
}

export const MealLogger: React.FC<MealLoggerProps> = ({
  meals,
  dailyLogs,
  selectedDate,
  log,
  onToggleMeal,
  onAddMeal,
  onDeleteMeal,
  onToggleFavorite,
  onDateChange,
  onOpenRecipe,
  groqApiKey,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mealToDelete, setMealToDelete] = useState<Meal | null>(null);
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [recipeText, setRecipeText] = useState('');
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [isFormattingRecipe, setIsFormattingRecipe] = useState(false);

  // Filter meals based on search query
  const filteredMeals = useMemo(() => {
    if (!searchQuery.trim()) return meals;
    const query = searchQuery.toLowerCase();
    return meals.filter(meal =>
      meal.name.toLowerCase().includes(query)
    );
  }, [meals, searchQuery]);

  // Sort meals: favorites first, then by recent usage, then alphabetically
  const sortedMeals = useMemo(() => {
    // Helper: get most recent date a meal was used
    const getLastUsedDate = (mealId: string): string | null => {
      const logsWithMeal = dailyLogs
        .filter(log => log.meals.includes(mealId))
        .sort((a, b) => b.date.localeCompare(a.date));
      return logsWithMeal[0]?.date || null;
    };

    return [...filteredMeals].sort((a, b) => {
      // 1. Favorites first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      // 2. Recently used
      const aDate = getLastUsedDate(a.id);
      const bDate = getLastUsedDate(b.id);
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

    onAddMeal({
      name: newMeal.name,
      calories: parseInt(newMeal.calories) || 0,
      protein: parseInt(newMeal.protein) || 0,
      carbs: parseInt(newMeal.carbs) || 0,
      fat: parseInt(newMeal.fat) || 0,
      recipe: formattedRecipe || undefined,
    });

    setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    setRecipeText('');
    setRecipeError(null);
    setShowAddForm(false);
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
          const isSelected = log.meals.includes(meal.id);
          return (
            <div
              key={meal.id}
              className={`meal-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleMeal(meal.id, selectedDate)}
            >
              <div className="meal-checkbox">
                {isSelected && <Check size={16} />}
              </div>
              <div className="meal-info">
                <span className="meal-name">
                  {meal.name}
                  {meal.recipe && (
                    <button
                      type="button"
                      className="recipe-indicator"
                      title="View recipe"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenRecipe(meal);
                      }}
                    >
                      <ChefHat size={16} />
                      <span>Recipe</span>
                    </button>
                  )}
                </span>
                <span className="meal-macros">
                  {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                </span>
              </div>
              <div className="meal-actions">
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
                  <button
                    className="delete-meal-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMealToDelete(meal);
                    }}
                  >
                    <Trash2 size={16} />
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
            <h4>Add Custom Meal</h4>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
                setRecipeText('');
                setRecipeError(null);
              }}
            >
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
            {isFormattingRecipe ? 'Formatting Recipe...' : 'Add Meal'}
          </button>
        </form>
      )}

      {mealToDelete && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <h4>Delete Meal?</h4>
            <p>Delete "{mealToDelete.name}" from your meal library?</p>
            <p className="delete-warning">This will remove it from all logged days.</p>
            <div className="delete-confirm-actions">
              <button className="btn-secondary" onClick={() => setMealToDelete(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={() => {
                onDeleteMeal(mealToDelete.id);
                setMealToDelete(null);
              }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
