/**
 * Recipe services - AI-powered Recipe creation and updates from natural language
 *
 * Individual steps:
 * - promptAnalysis.ts: Analyze user prompt to extract URL, fields, pagination depth
 * - updatePromptAnalysis.ts: Analyze update prompt to extract what should change
 * - engineConfig.ts: Compile Recipe-specific Firecrawl actions based on Source strategy
 */

export { analyzeRecipePrompt, type PromptAnalysisResult } from './promptAnalysis.js';
export {
  analyzeRecipeUpdatePrompt,
  type UpdatePromptAnalysisResult,
} from './updatePromptAnalysis.js';
export {
  compileRecipeEngineConfig,
  type RecipeEngineConfig,
  type CompileEngineConfigInput,
} from './engineConfig.js';
