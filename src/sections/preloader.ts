/** Growing-sprout preloader. Weighted progress across several tasks. */
export class Preloader {
  private el = document.querySelector<HTMLElement>('#preloader')!;
  private pct = document.querySelector<HTMLElement>('#preloader-pct')!;
  private path = this.el.querySelector<SVGPathElement>('.preloader__path')!;
  private parts = new Map<string, { weight: number; p: number }>();
  private shown = 0;

  track(name: string, weight: number) {
    this.parts.set(name, { weight, p: 0 });
    return (p: number) => {
      this.parts.get(name)!.p = Math.min(1, p);
      this.render();
    };
  }

  private render() {
    let total = 0;
    let done = 0;
    this.parts.forEach(({ weight, p }) => {
      total += weight;
      done += weight * p;
    });
    const v = total ? done / total : 0;
    this.shown = Math.max(this.shown, v); // never goes backwards
    this.pct.textContent = String(Math.round(this.shown * 100));
    this.path.style.setProperty('--p', this.shown.toFixed(3));
  }

  done(): Promise<void> {
    this.pct.textContent = '100';
    this.path.style.setProperty('--p', '1');
    return new Promise((resolve) => {
      setTimeout(() => {
        this.el.classList.add('is-done');
        document.documentElement.classList.remove('is-loading');
        resolve();
        setTimeout(() => this.el.remove(), 900);
      }, 250);
    });
  }
}
