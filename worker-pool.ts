import {
  Worker,
  type WorkerOptions,
} from "node:worker_threads";

interface WorkerMessage<TResult> {
  result: TResult;
}

interface PendingJob<TResult> {
  resolve: (result: TResult) => void;
  reject: (error: Error) => void;
}

interface PoolWorker {
  worker: Worker;
  busy: boolean;
}

interface QueuedJob<TJob, TResult> {
  job: TJob;
  pending: PendingJob<TResult>;
}

interface WorkerPoolOptions {
  workerFile: URL;
  workerCount: number;
  workerData?: unknown;
}

export class WorkerPool<TJob, TResult> {
  private readonly workers: PoolWorker[] = [];
  private readonly queue: Array<QueuedJob<TJob, TResult>> = [];

  private closed = false;

  public constructor(options: WorkerPoolOptions) {
    if (!Number.isInteger(options.workerCount)) {
      throw new TypeError("workerCount must be an integer");
    }

    if (options.workerCount < 1) {
      throw new RangeError("workerCount must be at least 1");
    }

    for (let i = 0; i < options.workerCount; i++) {
      this.createWorker(options.workerFile, {
        workerData: options.workerData,
      });
    }
  }

  public async run(jobs: readonly TJob[]): Promise<TResult[]> {
    if (this.closed) {
      throw new Error("Worker pool is closed");
    }

    return Promise.all(
      jobs.map((job) => this.enqueue(job)),
    );
  }

  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    const error = new Error("Worker pool was closed");

    for (const queuedJob of this.queue.splice(0)) {
      queuedJob.pending.reject(error);
    }

    await Promise.all(
      this.workers.map(({ worker }) => worker.terminate()),
    );

    this.workers.length = 0;
  }

  private enqueue(job: TJob): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      this.queue.push({
        job,
        pending: {
          resolve,
          reject,
        },
      });

      this.dispatch();
    });
  }

  private createWorker(
    workerFile: URL,
    options: WorkerOptions,
  ): void {
    const worker = new Worker(workerFile, options);

    const poolWorker: PoolWorker = {
      worker,
      busy: false,
    };

    let currentJob: PendingJob<TResult> | undefined;

    worker.on(
      "message",
      (message: WorkerMessage<TResult>) => {
        if (!currentJob) {
          this.handleFatalError(
            new Error(
              "Worker returned a result without an active job",
            ),
          );
          return;
        }

        const completedJob = currentJob;

        currentJob = undefined;
        poolWorker.busy = false;

        completedJob.resolve(message.result);

        this.dispatch();
      },
    );

    worker.on("error", (error) => {
      if (currentJob) {
        currentJob.reject(error as Error);
        currentJob = undefined;
      }

      poolWorker.busy = false;
      this.handleFatalError(error as Error);
    });

    worker.on("exit", (exitCode) => {
      if (this.closed) {
        return;
      }

      if (currentJob) {
        currentJob.reject(
          new Error(
            `Worker exited while processing a job with code ${exitCode}`,
          ),
        );

        currentJob = undefined;
      }

      poolWorker.busy = false;

      this.handleFatalError(
        new Error(
          `Worker exited unexpectedly with code ${exitCode}`,
        ),
      );
    });

    // Store the per-worker dispatch function privately on the object.
    Object.assign(poolWorker, {
      assignJob: (
        queuedJob: QueuedJob<TJob, TResult>,
      ): void => {
        currentJob = queuedJob.pending;
        poolWorker.busy = true;
        worker.postMessage(queuedJob.job);
      },
    });

    this.workers.push(poolWorker);
  }

  private dispatch(): void {
    if (this.closed) {
      return;
    }

    for (const poolWorker of this.workers) {
      if (this.queue.length === 0) {
        return;
      }

      if (poolWorker.busy) {
        continue;
      }

      const queuedJob = this.queue.shift();

      if (!queuedJob) {
        return;
      }

      const assignJob = (
        poolWorker as PoolWorker & {
          assignJob(
            job: QueuedJob<TJob, TResult>,
          ): void;
        }
      ).assignJob;

      assignJob(queuedJob);
    }
  }

  private handleFatalError(error: Error): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const queuedJob of this.queue.splice(0)) {
      queuedJob.pending.reject(error);
    }

    for (const { worker } of this.workers) {
      void worker.terminate();
    }
  }
}
