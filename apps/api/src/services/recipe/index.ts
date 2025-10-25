/**
 * Recipe services - AI-powered Recipe creation from natural language
 *
 * Individual steps:
 * - promptAnalysis.ts: Analyze user prompt to extract URL, fields, pagination depth
 * - engineConfig.ts: Compile Recipe-specific Firecrawl actions based on Source strategy
 */

export { analyzeRecipePrompt, type PromptAnalysisResult } from './promptAnalysis.js';
export {
  compileRecipeEngineConfig,
  type RecipeEngineConfig,
  type CompileEngineConfigInput,
} from './engineConfig.js';
