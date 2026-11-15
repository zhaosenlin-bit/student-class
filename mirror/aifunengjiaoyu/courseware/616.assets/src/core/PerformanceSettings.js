export class PerformanceSettings {
  constructor(){ this.low=localStorage.getItem('jdc-quality')==='low'; this.#sync(); }
  #sync(){ this.antialias=!this.low; this.shadows=!this.low; this.pixelRatio=this.low?1:1.5; this.particles=this.low?8:24; }
  toggle(){ this.low=!this.low; this.#sync(); localStorage.setItem('jdc-quality',this.low?'low':'high'); return this; }
}
