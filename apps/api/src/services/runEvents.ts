import { EventEmitter } from 'node:events';
import type { Run, Plan, RunStep, RunLog, Execution, ExecutionLog } from '../db/index.js';

export type RunEvent =
  | { type: 'run.updated'; run: Run }
  | { type: 'run.plan.updated'; plan: Plan }
  | { type: 'run.step.updated'; step: RunStep }
  | { type: 'run.log.appended'; log: RunLog }
  | { type: 'run.execution.created'; execution: Execution }
  | { type: 'run.execution.updated'; execution: Execution }
  | { type: 'run.execution.log'; log: ExecutionLog };

type RunEventListener = (event: RunEvent) => void;

class RunEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  subscribe(runId: string, listener: RunEventListener): () => void {
    const channel = this.channel(runId);
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  publish(runId: string, event: RunEvent): void {
    this.emitter.emit(this.channel(runId), event);
  }

  private channel(runId: string): string {
    return `run:${runId}`;
  }
}

export const runEventBus = new RunEventBus();
