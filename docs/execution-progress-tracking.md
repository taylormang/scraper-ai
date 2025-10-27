The Common Need: Structured Progress Events

Both MCP and Web need the same thing: a stream of progress updates they can display.

Shared Backend: Execution Progress Events

Store execution progress as a stream of structured events:

{
execution_id: "exec_123",
status: "running",
progress: {
phase: "scraping", // "starting" | "scraping" | "extracting" | "complete"
current_page: 3,
total_pages: 10,
items_count: 15,
percentage: 30
},
events: [
{ timestamp: "2025-10-25T18:39:01.000Z", type: "start", message: "Starting execution..." },
{ timestamp: "2025-10-25T18:39:02.000Z", type: "info", message: "Scraping page 1 of 10" },
{ timestamp: "2025-10-25T18:39:05.000Z", type: "success", message: "✓ Extracted 5 items from page 1" },
{ timestamp: "2025-10-25T18:39:06.000Z", type: "info", message: "Scraping page 2 of 10" },
{ timestamp: "2025-10-25T18:39:09.000Z", type: "success", message: "✓ Extracted 3 items from page 2" },
{ timestamp: "2025-10-25T18:39:10.000Z", type: "info", message: "Scraping page 3 of 10..." },
]
}

Approach 3+4+5 Adapted for Both:

Backend (Shared Foundation)

1. Enhanced Execution Type - Add progress tracking:
   interface Execution {
   // ... existing fields
   progress: {
   phase: "starting" | "scraping" | "extracting" | "complete" | "failed";
   current_page?: number;
   total_pages?: number;
   items_count: number;
   percentage: number;
   };
   events: Array<{
   timestamp: string;
   type: "start" | "info" | "success" | "error" | "warning";
   message: string;
   }>;
   }
2. Update RecipeExecutionService - Emit events during execution:
   // As it scrapes each page:
   await this.logEvent(executionId, "info", `Scraping page ${i} of ${totalPages}`);
   await this.logEvent(executionId, "success", `✓ Extracted ${items.length} items from page ${i}`);
   await this.updateProgress(executionId, {
   current_page: i,
   items_count: totalItems,
   percentage: (i / totalPages) \* 100
   });
3. Enhanced GET /api/executions/:id - Returns current state with all events

MCP Server (Option 3+4+5)

1. Option 3 - Enhanced get_execution response:
   Execution: execution_abc123
   Status: Running (60% complete)
   Phase: Scraping page 6 of 10
   Items collected: 32

Recent Progress:
[18:39:25] ✓ Extracted 5 items from page 5
[18:39:26] Scraping page 6 of 10
[18:39:29] ✓ Extracted 7 items from page 6
[18:39:30] Scraping page 7 of 10... 2. Option 4 - New wait_for_execution tool:
{
name: "wait_for_execution",
description: "Wait for an execution to complete and return the dataset. Polls internally.",
inputSchema: {
execution_id: { type: "string" },
timeout_seconds: { type: "number", default: 300 }
}
}

2. Polls every 3-5 seconds internally, blocks Claude, returns dataset when done.
3. Option 5 - scrape returns rich context:
   Started scraping 10 pages from Hacker News
   Execution ID: execution_abc123
   Estimated duration: ~2 minutes

Status: Scraping page 1 of 10
Items collected: 0

Use 'wait_for_execution execution_abc123' to get results when complete,
or 'get_execution execution_abc123' to check progress.

Web App Dashboard (Same Data!)

1. Execution Detail Page - Shows real-time progress:
   function ExecutionDetail({ executionId }) {
   const [execution, setExecution] = useState(null);


    useEffect(() => {
      // Poll every 2 seconds while running
      const interval = setInterval(async () => {
        const data = await fetch(`/api/executions/${executionId}`);
        setExecution(data);
        if (data.status !== 'running') clearInterval(interval);
      }, 2000);

      return () => clearInterval(interval);
    }, [executionId]);

    return (
      <div>
        <ProgressBar percentage={execution.progress.percentage} />
        <div className="thinking-log">
          {execution.events.map(event => (
            <div className="log-line">
              <span className="timestamp">{event.timestamp}</span>
              <span className={`message ${event.type}`}>{event.message}</span>
            </div>
          ))}
        </div>
      </div>
    );

} 2. Dashboard List - Shows running executions with progress:
Executions
┌─────────────────────────────────────┐
│ Hacker News (10 pages) │
│ [████████░░] 60% - Page 6 of 10 │
│ 32 items collected │
└─────────────────────────────────────┘

Why This Works for Both:

✅ Single source of truth - Same progress data for MCP and Web✅ Simple implementation - Just polling, no WebSockets
needed✅ Same UX feeling - Both show "thinking log" style updates✅ Works with MCP constraints - Polling is natural in
conversation✅ Scalable - Easy to add more event types later

Implementation Plan:

1. Add progress tracking to Execution type (types/execution.ts)
2. Create event logging methods in RecipeExecutionService
3. Emit events during scraping (page start, items extracted, errors)
4. Enhance GET /api/executions/:id to return progress + events
5. Add wait_for_execution MCP tool (polls internally, returns dataset)
6. Update get_execution MCP tool to format events nicely
7. Build Web UI - Execution detail page with thinking-log-style display

Does this feel right? The key is the shared events structure that both MCP and Web consume. Simple polling on both ends,
no complex streaming.
