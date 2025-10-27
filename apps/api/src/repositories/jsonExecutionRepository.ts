/**
 * JSON Execution Repository
 *
 * Stores executions in JSON files (temporary storage until we migrate to database)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Execution, ExecutionLog, ExecutionEvent, ExecutionProgress } from '../types/execution.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');
const EXECUTION_LOGS_FILE = path.join(DATA_DIR, 'execution_logs.json');

export class JsonExecutionRepository {
  private executionsCache: Execution[] | null = null;
  private logsCache: ExecutionLog[] | null = null;

  constructor() {
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      console.error('[JsonExecutionRepository] Error creating data directory:', error);
    }
  }

  private async loadExecutions(): Promise<Execution[]> {
    if (this.executionsCache) {
      return this.executionsCache;
    }

    try {
      const data = await fs.readFile(EXECUTIONS_FILE, 'utf-8');
      this.executionsCache = JSON.parse(data);
      return this.executionsCache!;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.executionsCache = [];
        return this.executionsCache;
      }
      throw error;
    }
  }

  private async saveExecutions(executions: Execution[]): Promise<void> {
    this.executionsCache = executions;
    await fs.writeFile(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
  }

  private async loadLogs(): Promise<ExecutionLog[]> {
    if (this.logsCache) {
      return this.logsCache;
    }

    try {
      const data = await fs.readFile(EXECUTION_LOGS_FILE, 'utf-8');
      this.logsCache = JSON.parse(data);
      return this.logsCache!;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logsCache = [];
        return this.logsCache;
      }
      throw error;
    }
  }

  private async saveLogs(logs: ExecutionLog[]): Promise<void> {
    this.logsCache = logs;
    await fs.writeFile(EXECUTION_LOGS_FILE, JSON.stringify(logs, null, 2));
  }

  async create(execution: Omit<Execution, 'id' | 'created_at' | 'updated_at'>): Promise<Execution> {
    const executions = await this.loadExecutions();

    const newExecution: Execution = {
      ...execution,
      id: `execution_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    executions.push(newExecution);
    await this.saveExecutions(executions);

    return newExecution;
  }

  async findById(id: string): Promise<Execution | null> {
    const executions = await this.loadExecutions();
    return executions.find((e) => e.id === id) || null;
  }

  async findByRecipeId(recipeId: string): Promise<Execution[]> {
    const executions = await this.loadExecutions();
    return executions
      .filter((e) => e.recipe_id === recipeId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async list(limit?: number): Promise<Execution[]> {
    const executions = await this.loadExecutions();
    const sorted = executions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async update(
    id: string,
    updates: Partial<Omit<Execution, 'id' | 'created_at'>>
  ): Promise<Execution | null> {
    const executions = await this.loadExecutions();
    const index = executions.findIndex((e) => e.id === id);

    if (index === -1) {
      return null;
    }

    executions[index] = {
      ...executions[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await this.saveExecutions(executions);
    return executions[index];
  }

  async delete(id: string): Promise<boolean> {
    const executions = await this.loadExecutions();
    const filtered = executions.filter((e) => e.id !== id);

    if (filtered.length === executions.length) {
      return false;
    }

    await this.saveExecutions(filtered);

    // Also delete associated logs
    const logs = await this.loadLogs();
    const filteredLogs = logs.filter((log) => log.execution_id !== id);
    await this.saveLogs(filteredLogs);

    return true;
  }

  // Log methods
  async appendLog(
    executionId: string,
    log: Omit<ExecutionLog, 'id' | 'execution_id' | 'sequence' | 'created_at'>
  ): Promise<ExecutionLog> {
    const logs = await this.loadLogs();
    const executionLogs = logs.filter((l) => l.execution_id === executionId);
    const nextSequence = executionLogs.length > 0 ? Math.max(...executionLogs.map((l) => l.sequence)) + 1 : 0;

    const newLog: ExecutionLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      execution_id: executionId,
      sequence: nextSequence,
      created_at: new Date().toISOString(),
    };

    logs.push(newLog);
    await this.saveLogs(logs);

    return newLog;
  }

  async getLogs(executionId: string): Promise<ExecutionLog[]> {
    const logs = await this.loadLogs();
    return logs
      .filter((log) => log.execution_id === executionId)
      .sort((a, b) => a.sequence - b.sequence);
  }

  async getLogsAfter(executionId: string, afterSequence: number): Promise<ExecutionLog[]> {
    const logs = await this.loadLogs();
    return logs
      .filter((log) => log.execution_id === executionId && log.sequence > afterSequence)
      .sort((a, b) => a.sequence - b.sequence);
  }

  // Progress tracking methods
  async addEvent(
    executionId: string,
    type: ExecutionEvent['type'],
    message: string,
    data?: any
  ): Promise<Execution | null> {
    const execution = await this.findById(executionId);
    if (!execution) {
      return null;
    }

    const event: ExecutionEvent = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data,
    };

    execution.events = execution.events || [];
    execution.events.push(event);

    return this.update(executionId, { events: execution.events });
  }

  async updateProgress(
    executionId: string,
    progress: Partial<ExecutionProgress>
  ): Promise<Execution | null> {
    const execution = await this.findById(executionId);
    if (!execution) {
      return null;
    }

    const updatedProgress: ExecutionProgress = {
      ...execution.progress,
      ...progress,
    };

    return this.update(executionId, { progress: updatedProgress });
  }

  async addEventAndUpdateProgress(
    executionId: string,
    type: ExecutionEvent['type'],
    message: string,
    progress?: Partial<ExecutionProgress>,
    eventData?: any
  ): Promise<Execution | null> {
    const execution = await this.findById(executionId);
    if (!execution) {
      return null;
    }

    // Add event
    const event: ExecutionEvent = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data: eventData,
    };

    execution.events = execution.events || [];
    execution.events.push(event);

    // Update progress if provided
    let updatedProgress = execution.progress;
    if (progress) {
      updatedProgress = {
        ...execution.progress,
        ...progress,
      };
    }

    return this.update(executionId, {
      events: execution.events,
      progress: updatedProgress
    });
  }
}
