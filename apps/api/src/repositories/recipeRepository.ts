import type { Recipe } from '../types/recipe.js';

export interface RecipeRepository {
  create(recipeData: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe>;
  update(id: string, recipeData: Partial<Recipe>): Promise<Recipe>;
  findById(id: string): Promise<Recipe | null>;
  findByUserId(userId: string): Promise<Recipe[]>;
  list(): Promise<Recipe[]>;
  delete(id: string): Promise<boolean>;
}
