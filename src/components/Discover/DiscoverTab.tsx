import React, { useState } from 'react';
import { Search, X, Upload, Loader2, Globe } from 'lucide-react';
import { MasterMealCard } from './MasterMealCard';
import { SubmitMealModal } from './SubmitMealModal';
import { MySubmissionsPanel } from './MySubmissionsPanel';
import { AdminPanel } from '../Admin/AdminPanel';
import RecipeModal from '../RecipeModal';
import type { Meal, MasterMeal, MealSubmission } from '../../types';

interface DiscoverTabProps {
  meals: Meal[];
  masterMeals: MasterMeal[];
  masterMealsLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  savedMasterMealIds: string[];
  onSaveMasterMealToLibrary: (mealId: string) => void;
  isAdmin: boolean;
  submissions: MealSubmission[];
  pendingCount: number;
  onSubmitMeal: (meal: Meal) => Promise<boolean>;
  onCancelSubmission: (submissionId: string) => Promise<boolean>;
  onApproveSubmission: (submissionId: string, submitterName?: string) => Promise<boolean>;
  onRejectSubmission: (submissionId: string, reason: string) => Promise<boolean>;
  onRefreshMasterMeals: () => void;
  onDeleteMasterMeal: (mealId: string) => Promise<boolean>;
  checkDuplicateName: (name: string) => boolean;
}

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  meals,
  masterMeals,
  masterMealsLoading,
  searchQuery,
  onSearchChange,
  savedMasterMealIds,
  onSaveMasterMealToLibrary,
  isAdmin,
  submissions,
  pendingCount,
  onSubmitMeal,
  onCancelSubmission,
  onApproveSubmission,
  onRejectSubmission,
  onRefreshMasterMeals,
  onDeleteMasterMeal,
  checkDuplicateName,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [recipeModalMeal, setRecipeModalMeal] = useState<MasterMeal | null>(null);

  // Check if a master meal is saved to user's library
  const isMealSaved = (mealId: string) => {
    return savedMasterMealIds.includes(mealId);
  };

  return (
    <div className="discover-tab">
      <div className="discover-header">
        <div className="discover-title">
          <Globe size={24} />
          <h2>Discover Community Meals</h2>
        </div>
        <p className="discover-subtitle">
          Browse meals shared by the community or submit your own for review
        </p>
      </div>

      <div className="discover-actions">
        <div className="discover-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search community meals..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => onSearchChange('')}
              type="button"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className="submit-meal-btn"
          onClick={() => setShowSubmitModal(true)}
        >
          <Upload size={18} />
          Submit a Meal
        </button>
      </div>

      {/* Admin Panel (only visible to admins) */}
      {isAdmin && (
        <AdminPanel
          submissions={submissions.filter((s) => s.status === 'pending')}
          pendingCount={pendingCount}
          onApprove={onApproveSubmission}
          onReject={onRejectSubmission}
          onRefresh={onRefreshMasterMeals}
        />
      )}

      {/* My Submissions Panel */}
      <MySubmissionsPanel
        submissions={submissions}
        onCancelSubmission={onCancelSubmission}
      />

      {/* Master Meals Grid */}
      <div className="master-meals-section">
        <h3>Community Meals ({masterMeals.length})</h3>

        {masterMealsLoading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spinner" />
            <p>Loading community meals...</p>
          </div>
        ) : masterMeals.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <p>No meals found for "{searchQuery}"</p>
            ) : (
              <>
                <Globe size={48} className="empty-icon" />
                <p>No community meals yet</p>
                <p className="empty-hint">Be the first to submit a meal!</p>
              </>
            )}
          </div>
        ) : (
          <div className="master-meals-grid">
            {masterMeals.map((meal) => (
              <MasterMealCard
                key={meal.id}
                meal={meal}
                onAddToLibrary={onSaveMasterMealToLibrary}
                onViewRecipe={(m) => setRecipeModalMeal(m)}
                isSaved={isMealSaved(meal.id)}
                isAdmin={isAdmin}
                onDelete={onDeleteMasterMeal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Submit Meal Modal */}
      {showSubmitModal && (
        <SubmitMealModal
          meals={meals}
          submissions={submissions}
          checkDuplicateName={checkDuplicateName}
          onSubmit={onSubmitMeal}
          onClose={() => setShowSubmitModal(false)}
        />
      )}

      {/* Recipe Modal */}
      {recipeModalMeal && recipeModalMeal.recipe && (
        <RecipeModal
          meal={{
            id: recipeModalMeal.id,
            name: recipeModalMeal.name,
            calories: recipeModalMeal.calories,
            protein: recipeModalMeal.protein,
            carbs: recipeModalMeal.carbs,
            fat: recipeModalMeal.fat,
            fiber: recipeModalMeal.fiber || 0,
            sugar: recipeModalMeal.sugar || 0,
            recipe: recipeModalMeal.recipe,
          }}
          onClose={() => setRecipeModalMeal(null)}
        />
      )}
    </div>
  );
};
