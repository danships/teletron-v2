export class ReconnectPolicy {
  private delay = 1000;
  private readySince: number | undefined;

  constructor(
    private readonly random: () => number,
    private readonly now: () => number
  ) {}

  ready() {
    this.readySince = this.now();
  }

  next() {
    if (this.readySince !== undefined && this.now() - this.readySince >= 60_000) this.delay = 1000;
    this.readySince = undefined;
    const jittered = Math.round(this.delay * (1 + this.random() * 0.5));
    this.delay = Math.min(30_000, this.delay * 2);
    return jittered;
  }
}
