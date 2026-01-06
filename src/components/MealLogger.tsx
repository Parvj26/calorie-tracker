import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Meal, DailyLog } from '../types';

interface MealLoggerProps {
  meals: Meal[];
  selectedDate: string;
  log: DailyLog;
  onToggleMeal: (mealId: string, date: string) => void;
  onAddMeal: (meal: Omit<Meal, 'id' | 'isCustom'>) => void;
  onDeleteMeal: (mealId: string) => void;
  onDateChange: (date: string) => void;
}

export const MealLogger: React.FC<MealLoggerProps> = ({
  meals,
  selectedDate,
  log,
  onToggleMeal,
  onAddMeal,
  onDeleteMeal,
  onDateChange,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeal.name || !newMeal.calories) return;

    onAddMeal({
      name: newMeal.name,
      calories: parseInt(newMeal.calories) || 0,
      protein: parseInt(newMeal.protein) || 0,
      carbs: parseInt(newMeal.carbs) || 0,
      fat: parseInt(newMeal.fat) || 0,
    });

    setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
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
        {meals.map((meal) => {
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
                <span className="meal-name">{meal.name}</span>
                <span className="meal-macros">
                  {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                </span>
              </div>
              {meal.isCustom && (
                <button
                  className="delete-meal-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteMeal(meal.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
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
            <button type="button" onClick={() => setShowAddForm(false)}>
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
          <button type="submit" className="submit-btn">
            Add Meal
          </button>
        </form>
      )}
    </div>
  );
};
