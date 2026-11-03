/**
 * Minimal type surface for Bun's test runner (`bun test`). The full `bun-types`
 * package conflicts with the app's DOM `fetch` typings, so only the API this
 * project's tests use is declared here.
 */
declare module "bun:test" {
  interface Expectation<T> {
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toHaveLength(length: number): void;
    toContain(expected: unknown): void;
    toMatch(pattern: string | RegExp): void;
    toBeDefined(): void;
    toBeNull(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
  }

  export function describe(name: string, factory: () => void): void;
  export function test(name: string, factory: () => void | Promise<void>): void;
  export function expect<T>(actual: T): Expectation<T>;
}
