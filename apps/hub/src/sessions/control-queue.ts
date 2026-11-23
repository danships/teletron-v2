export class ControlQueue {
  private readonly pending: string[] = [];
  constructor(
    private readonly send: (message: string, done: () => void) => void,
    private readonly close: (code: number) => void
  ) {}
  enqueue(message: string) {
    if (this.pending.length === 256) {
      this.close(4008);
      return;
    }
    this.pending.push(message);
    if (this.pending.length === 1) this.flush();
  }
  private flush() {
    const message = this.pending[0];
    if (message === undefined) return;
    this.send(message, () => {
      this.pending.shift();
      this.flush();
    });
  }
}
