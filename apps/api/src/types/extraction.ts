// Extraction types
// Aligned with /docs/architecture_v1.md

// JSON Schema type (simplified)
// For full JSON Schema support, consider: npm install @types/json-schema
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  [key: string]: any; // Allow additional JSON Schema properties
}

// Field selectors for extraction
export type Selectors = {
  [fieldName: string]: {
    css?: string; // CSS selector
    xpath?: string; // XPath selector
    regex?: string; // Regex pattern
    transform?: string; // Post-processing (e.g., 'trim', 'lowercase', 'uppercase')
  };
};

// Validation rules for extracted data
export interface ValidationRule {
  field: string; // Field to validate
  rule: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any; // Rule-specific value (e.g., regex pattern, min length)
  message?: string; // Error message if validation fails
}

// Extraction configuration for a Recipe
export interface ExtractionConfig {
  schema: JSONSchema; // Target data structure
  selectorsBySource: Record<string, Selectors>; // Source ID -> Selectors
  fieldMappings?: Record<string, Record<string, string>>; // Source-specific field mappings
  validation?: {
    required: string[]; // Required fields
    minItems?: number; // Minimum items per execution
    customRules?: ValidationRule[];
  };
}
