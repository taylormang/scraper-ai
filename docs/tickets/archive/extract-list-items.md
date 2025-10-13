# Extract List Items

## Prerequisites
**REQUIRED**:
- ✅ Complete [AI Infrastructure Refactoring](./ai-infrastructure-refactor.md)
- ✅ Complete [Auto-Generated Schema Validation System](./schema-validation-system.md)

## Description 

In our current state, we can extract data from a list on a page. This is useful but shallow. 

For most lists on web sites, the items will each be clickable, with in depth content available on the list item's individual page

Examples:
- Lists of products > individual product details page
- Lists of marketplace apps > indiviudal app details page
- List of jobs > individual job details page

User Stories:
- As a job seeker, I want to extract lists of job postings, as well as the specific job description, requirements, and other content available only when clicking into the posting, so that I can chat with an LLM against the full dataset and find highly applicable jobs to my experience, skillset, and interest
- As an app builder, I want to extract lists of apps, as well as the app's details, reviews, and other content available only when clicking into the posting, so that I can perform market and competitor ressearch research 

## Requirements

- Optional toggle `clickThroughToListItem` `bool` (or similar) to enable the mechanism. When not present, perform just top-list extraction
- Optional `clickThroughLinkPrompt` - a natural language description of what element needs to be clicked on for each list-item. Our engine will use a similar approach to the `navigationLinkPrompt` here, and use the identified selector for each list-item
- `clickThroughExtractionPrompt` - a natural language prompt provided by the user, stored in the scrape config, that describes the contents, fields, and information that they want to extract from the click-through page and store with the item
- Results from the click-through page are stored inside an object as part of the overall output list
- The click-through content extraction can gather various types of data, including lists of informaiton from the click-through page, such as comments or app reviews, as specified by the user
- Ensure there is no degradation to other functionality, such as list extraction and pagination, which should all progress as normal
- Recognize that many single page web apps may not have hard URLs for list items, but rather javascript-rendered data once clicked

## Test Site

Use hackernews as the test site
The "click-through" link will be the "comments" button associated with each list item
The click-through content to extract with be the first page of comments, storing a list of comments and their votes

## Implementation Plan

### Overview
Extend the existing scraping system to enable click-through extraction from list items. This builds on the current AI-powered navigation system to click into individual list items and extract detailed content.

### Core Components to Add (Post-Prerequisites)

**NOTE**: This builds on completed prerequisites:
- **AI Infrastructure**: Uses `AIService`, `PromptBuilder`, `ContentProcessor`, and `ResultParser` abstractions
- **Schema Validation**: Leverages `SchemaDiscovery` and `SchemaEnforcer` for data consistency

#### 1. Configuration Schema Updates (`types.ts`)
```typescript
export interface ScraperConfig {
  // ... existing fields ...

  // New click-through fields
  clickThroughToListItem?: boolean;
  clickThroughLinkPrompt?: string;        // "click the comments link for each story"
  clickThroughExtractionPrompt?: string;  // "extract comments with author and points"
}
```

#### 2. Enhanced AI Extractor (`ai-extractor.ts`)
- Add new `extractListItemsWithDetails()` method using existing `AIService`
- Use `PromptBuilder.clickThroughExtraction()` for consistent prompts
- Use `ContentProcessor` for HTML handling
- Integrate with click-through navigator for detail extraction

#### 3. New Click-Through Navigator Class (`click-through-navigator.ts`)
- Build on existing `PageNavigator` patterns
- Use `AIService` for all AI operations (element identification, content extraction)
- Use `PromptBuilder` templates for consistent prompting
- Handle clicking into list items and returning to list
- Manage browser state between list and detail pages
- Support both traditional URLs and SPA-style navigation

Key methods:
- `extractWithClickThrough(page, listItems, config)` - Main orchestration
- `clickIntoItem(page, itemElement, linkPrompt)` - Navigate to detail page
- `extractDetailContent(page, extractionPrompt)` - Extract from detail page
- `navigateBack(page)` - Return to list (browser back or close tab)

#### 4. Scraper Integration (`scraper.ts`)
- Modify existing scraping flow to detect click-through configuration
- After initial list extraction, trigger click-through process if enabled
- Maintain existing pagination functionality

### Implementation Flow

**PREREQUISITES**: Complete both prerequisite tickets first.

#### Phase 1: Schema Infrastructure for Click-Through
1. Create `SchemaManager` class for handling dual schemas
2. Add schema merging logic with conflict resolution
3. Update `ScraperConfig` with click-through fields
4. Add TypeScript interfaces for dual-schema results
5. Create test configs with Hacker News click-through example

#### Phase 2: Click-Through Navigator with Schema Integration
1. Create `ClickThroughNavigator` class using AI abstractions
2. Implement element identification using `PromptBuilder` templates
3. Handle navigation state management (tabs vs back button)
4. Add error handling for failed clicks or navigation
5. **Schema Integration**: Discover detail schema from first click-through
6. Use `AIService` for all AI operations with rate limiting

#### Phase 3: Enhanced AI Integration with Dual Validation
1. Extend `AIExtractor` with schema-aware click-through methods
2. Implement list item to detail page linking logic
3. **Schema-Driven Merging**: Combine list + detail data using schemas
4. **Dual Validation**: Enforce both list and detail schemas
5. Use `ContentProcessor` for all HTML handling

#### Phase 4: Main Scraper Integration with Schema Management
1. Modify `BasicScraper.scrape()` to detect click-through config
2. **List Schema**: Use existing auto-discovery for list pages
3. **Detail Schema**: Auto-discover from first successful click-through
4. **Schema Enforcement**: Validate all subsequent items against both schemas
5. Integrate click-through flow after initial list extraction
6. Maintain compatibility with existing configurations

#### Phase 5: Schema Conflict Resolution and Error Handling
1. Implement intelligent schema merging with conflict detection
2. Add namespace prefixing for conflicting field names
3. **Graceful Degradation**: Handle schema violations in detail extraction
4. **Partial Results**: Return list data even if detail extraction fails
5. **Schema Logging**: Clear console output for schema decisions

#### Phase 6: Testing and Validation
1. Test with Hacker News comments extraction
2. **Schema Consistency**: Verify both list and detail schemas work
3. **Conflict Handling**: Test scenarios with overlapping field names
4. **Error Recovery**: Test failed click-throughs with schema enforcement
5. Verify no regression in existing list + pagination functionality
6. Performance testing with dual schema validation

### Benefits of AI Infrastructure Abstractions

#### Code Quality Improvements
- **Eliminates Duplication**: Removes identical OpenAI API calls and HTML processing logic
- **Consistency**: Standardized prompt engineering and response handling across all AI use cases
- **Maintainability**: Changes to AI behavior centralized in single classes
- **Type Safety**: Proper TypeScript interfaces for all AI operations

#### Scalability & Performance
- **Rate Limiting**: Centralized request throttling to prevent API abuse
- **Connection Pooling**: Reuse HTTP connections for OpenAI API calls
- **Caching**: Future capability to cache AI responses for repeated operations
- **Batching**: Ability to batch multiple AI requests for efficiency

#### Extensibility
- **Plugin Architecture**: Easy to add new AI providers (Anthropic, etc.)
- **Template System**: Simple to add new prompt patterns for different use cases
- **Configurable Models**: Easy to switch between GPT-3.5, GPT-4, etc. per operation
- **Future Features**: Foundation for advanced AI features (chain-of-thought, function calling)

### Technical Considerations

#### Browser State Management
- Use browser tabs for click-through to preserve list state
- Alternative: track list position and re-navigate if needed
- Handle SPAs that don't change URLs but update content

#### Performance Optimization
- Batch click-throughs when possible using new `AIService` rate limiting
- Add configurable delays between requests
- Implement concurrent extraction limits
- Use `ContentProcessor` for efficient HTML preprocessing

#### Error Handling
- Graceful degradation when click-through fails
- Return partial results with error indicators
- Timeout handling for slow-loading detail pages
- Centralized AI error handling through `AIService`

#### Schema-Driven Data Structure

**Key Innovation**: The click-through feature leverages the existing auto-generated schema system to ensure data consistency across both list and detail pages.

##### Schema Management Strategy:
1. **List Schema**: Auto-discovered from initial list page extraction (already implemented)
2. **Detail Schema**: Auto-discovered from first successful click-through extraction
3. **Schema Merging**: Intelligent combination of list + detail schemas with conflict resolution
4. **Dual Validation**: Both list and detail data validated against their respective schemas

##### Enhanced Result Structure:
```typescript
// List item with embedded detail content
{
  // List data (validated against list schema)
  title: "Some Article Title",
  author: "username",
  points: 42,
  comments_count: 15,

  // Detail data (validated against detail schema)
  clickThroughData: {
    success: true,
    url: "https://news.ycombinator.com/item?id=123",
    schema: "auto_hackernews_detail", // Reference to detail schema used
    content: {
      // Detail fields validated against detail schema
      comments: [
        { author: "user1", text: "Comment text", points: 5, depth: 0 },
        { author: "user2", text: "Reply text", points: 2, depth: 1 }
      ],
      total_comments: 15,
      discussion_started: "2024-01-15T10:30:00Z"
    }
  }
}
```

##### Schema Conflict Resolution:
When list and detail schemas have overlapping field names, the system will:
- **Preserve Both**: `list_title` vs `detail_title` when content differs
- **Merge Intelligently**: Use detail value when it's more comprehensive
- **Namespace Conflicts**: Prefix with `list_` or `detail_` as needed
- **Log Decisions**: Clear warnings about conflict resolution choices

##### Schema Discovery Flow:
```typescript
// Phase 1: List schema discovery (already implemented)
listSchema = SchemaDiscovery.discoverSchema(listItems, `${configName}_list`);

// Phase 2: Detail schema discovery (new)
firstDetailData = await extractDetailContent(firstItem);
detailSchema = SchemaDiscovery.discoverSchema([firstDetailData], `${configName}_detail`);

// Phase 3: Schema merging and conflict detection
mergedSchema = SchemaManager.mergeSchemas(listSchema, detailSchema);

// Phase 4: Validation for all subsequent items
for (item of remainingItems) {
  validatedListData = SchemaEnforcer.enforceSchema([item], listSchema);
  validatedDetailData = SchemaEnforcer.enforceSchema([detailContent], detailSchema);
}
```

### Test Implementation (Hacker News)
```typescript
const hackerNewsWithComments: ScraperConfig = {
  name: 'hackernews-with-comments',
  baseUrl: 'https://news.ycombinator.com',
  extractionPrompt: 'Extract each article with: title, link URL, points, author, comment count',
  clickThroughToListItem: true,
  clickThroughLinkPrompt: 'click the comments link for each story',
  clickThroughExtractionPrompt: 'Extract first 10 comments with: author name, comment text, and points/score',
  navigationType: 'button',
  navigationPrompt: 'click "More"',
  maxPages: 2
};
```

### Expected Console Output (Schema Integration)

#### Initial List Extraction with Schema Discovery:
```bash
🔍 Starting scrape of: https://news.ycombinator.com
📄 Scraping page 1 of 2...
🤖 Using AI-powered extraction on page 1...
🤖 AI extracted 30 items
📋 Auto-discovered LIST schema with 5 fields: title, link, points, author, comments_count
✅ AI extracted 30 items from page 1

🔗 Click-through extraction enabled - processing list items...
```

#### Detail Schema Discovery from First Click-Through:
```bash
📄 Clicking through to first item for detail schema discovery...
🎯 AI identified click element: .storylink (for "Some Article Title")
✅ Successfully clicked through to detail page
🤖 Using AI-powered extraction on detail page...
🤖 AI extracted detail content
📋 Auto-discovered DETAIL schema with 4 fields: comments, total_comments, discussion_started, article_text
🔄 Merging list and detail schemas...
✅ Schema merge complete - no conflicts detected

📊 Processing remaining 29 items with established schemas...
```

#### Schema Enforcement During Click-Through:
```bash
📄 Processing item 2/30: "Another Article Title"
🎯 AI identified click element: .storylink
✅ Successfully clicked through to detail page
🤖 Using AI-powered extraction on detail page...
✅ Detail schema enforcement passed: content conforms to established schema
✅ Combined list + detail data for item 2

📄 Processing item 3/30: "Third Article Title"
🎯 AI identified click element: .storylink
✅ Successfully clicked through to detail page
🤖 Using AI-powered extraction on detail page...
⚠️  Detail schema warnings: 1 issue
   Detail content: Missing required field 'article_text', using default value
✅ Detail schema enforcement passed with warnings
✅ Combined list + detail data for item 3
```

#### Schema Conflict Resolution (When Field Names Overlap):
```bash
📄 Processing item 15/30: "Article with Title Conflict"
🤖 Using AI-powered extraction on detail page...
⚠️  Schema conflict detected: field 'title' exists in both schemas
🔄 Resolving conflict: list_title vs detail_title
   List title: "Article with Title Conflict"
   Detail title: "Article with Title Conflict - Full Story with More Context"
✅ Conflict resolved: using detail_title (more comprehensive)
✅ Detail schema enforcement passed with conflict resolution
✅ Combined list + detail data for item 15
```

### Success Criteria
- ✅ Extract list items with embedded detail content
- ✅ **Dual Schema Validation**: Both list and detail data conform to auto-discovered schemas
- ✅ **Schema Conflict Resolution**: Intelligent handling of overlapping field names
- ✅ **Graceful Schema Degradation**: Handle missing detail fields with defaults
- ✅ **Zero Configuration**: Auto-discovery works without user schema definition
- ✅ Maintain existing pagination functionality
- ✅ Handle both URL-based and SPA navigation
- ✅ Graceful error handling for failed click-throughs
- ✅ No performance degradation for non-click-through configs
- ✅ Hacker News comments extraction working end-to-end with schema consistency