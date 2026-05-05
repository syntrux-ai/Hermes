type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache<T> {
  private readonly values = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string) {
    const entry = this.values.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T) {
    this.values.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
