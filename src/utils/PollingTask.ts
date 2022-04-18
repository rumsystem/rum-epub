export class PollingTask {
  private timerId = 0;
  private task: (...args: Array<any>) => unknown;
  private stopFlag = false;
  private taskRunning = false;

  public constructor(
    task: (...args: Array<any>) => unknown,
    private interval: number,
    startNow = false,
    runOnStart = false,
  ) {
    this.task = async () => {
      if (this.stopFlag) { return; }
      this.taskRunning = true;
      await Promise.resolve(task()).catch((e) => console.error(e));
      this.taskRunning = false;
      if (this.stopFlag) { return; }
      this.timerId = window.setTimeout(() => {
        this.task();
      }, this.interval);
    };
    if (startNow) {
      this.start(runOnStart);
    }
  }

  public start(runOnStart = false) {
    if (runOnStart) {
      this.task();
    } else {
      this.timerId = window.setTimeout(this.task, this.interval);
    }
  }

  public stop() {
    window.clearTimeout(this.timerId);
    this.stopFlag = true;
  }

  public runImmediately() {
    if (this.stopFlag || this.taskRunning) {
      return;
    }
    window.clearTimeout(this.timerId);
    this.task();
  }
}
