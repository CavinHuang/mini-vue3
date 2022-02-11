import { extend } from "../shared";

let activeEffect: ReactiveEffect;
let shouldTrack;
const targetMap = new WeakMap();

export class ReactiveEffect {
  // effect传递的第一个参数
  private _fn: () => void;
  // effect传递的第二个对象的scheduler属性。如果有传该参数，则trigger是会触发该函数
  // 调用stop函数会执行该函数
  onStop?: () => void;
  // 该变量用来记录是否调过stop函数
  active = true;
  // 收集该该effect的dep
  deps: any[] = [];

  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    activeEffect = this;
    if (!this.active) {
      return this._fn();
    }
    shouldTrack = true;
    const res = this._fn();
    shouldTrack = false;
    return res;
  }

  stop() {
    if (this.active) {
      cleanupEffect(this);
      this.onStop && this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((dep) => {
    dep.delete(effect);
  });
  // 清空effect.deps
  effect.deps.length = 0;
}

export function track(target, key) {
  if (!isTracking()) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  trackEffects(dep);
}

export function trackEffects(dep) {
  dep.add(activeEffect);
  activeEffect.deps.push(dep);
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const dep = depsMap.get(key);
  triggerEffects(dep);
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options);
  _effect.run();

  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;

  return runner;
}

export function stop(runner) {
  runner.effect.stop();
}
