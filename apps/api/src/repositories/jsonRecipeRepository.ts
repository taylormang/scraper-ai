import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import type { Recipe } from '../types/recipe.js';

const DATA_DIR = path.join(process.cwd(), 'data', 'recipes');
const RECIPES_FILE = path.join(DATA_DIR, 'recipes.json');

export class JsonRecipeRepository {
  private async ensureDataDir(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  private async readRecipes(): Promise<Recipe[]> {
    try {
      const data = await fs.readFile(RECIPES_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async writeRecipes(recipes: Recipe[]): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2), 'utf-8');
  }

  async create(recipeData: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe> {
    const recipes = await this.readRecipes();
    const now = new Date().toISOString();

    const recipe: Recipe = {
      ...recipeData,
      id: `recipe_${nanoid(12)}`,
      created_at: now,
      updated_at: now,
    };

    recipes.push(recipe);
    await this.writeRecipes(recipes);

    return recipe;
  }

  async update(id: string, recipeData: Partial<Recipe>): Promise<Recipe> {
    const recipes = await this.readRecipes();
    const index = recipes.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error(`Recipe ${id} not found`);
    }

    const updated: Recipe = {
      ...recipes[index],
      ...recipeData,
      id: recipes[index].id, // Preserve ID
      created_at: recipes[index].created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };

    recipes[index] = updated;
    await this.writeRecipes(recipes);

    return updated;
  }

  async findById(id: string): Promise<Recipe | null> {
    const recipes = await this.readRecipes();
    return recipes.find((r) => r.id === id) || null;
  }

  async findByUserId(userId: string): Promise<Recipe[]> {
    const recipes = await this.readRecipes();
    return recipes.filter((r) => r.user_id === userId);
  }

  async list(): Promise<Recipe[]> {
    return this.readRecipes();
  }

  async delete(id: string): Promise<boolean> {
    const recipes = await this.readRecipes();
    const filtered = recipes.filter((r) => r.id !== id);

    if (filtered.length === recipes.length) {
      return false; // Recipe not found
    }

    await this.writeRecipes(filtered);
    return true;
  }
}
