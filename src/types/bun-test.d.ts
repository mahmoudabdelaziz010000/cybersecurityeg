/**
 * Minimal type surface for Bun's test runner (`bun test`). The full `bun-types`
 * package conflicts with the app's DOM `fetch` typings, so only the API this
 * project's tests use is declared here.
 */
declare module "bun:test" {
  interface Expectation<T> {
    readonly not: Expectation<T>;
    readonly rejects: Expectation<Awaited<T>>;
    readonly resolves: Expectation<Awaited<T>>;
    toBe(expected: T): void;
    toEqual(expected: unknown): void;
    toMatchObject(expected: unknown): void;
    toHaveLength(length: number): void;
    toContain(expected: unknown): void;
    toMatch(pattern: string | RegExp): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeInstanceOf(expected: Function): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toThrow(expected?: unknown): void;
  }

  export function describe(name: string, factory: () => void): void;
  export function test(name: string, factory: () => void | Promise<void>): void;
  export function beforeEach(factory: () => void | Promise<void>): void;
  export function beforeAll(factory: () => void | Promise<void>): void;
  export function afterAll(factory: () => void | Promise<void>): void;
  export function expect<T>(actual: T, message?: string): Expectation<T>;
}

interface BunTestServer {
  port: number;
  stop(force?: boolean): void;
}

declare const Bun: {
  file(path: string): unknown;
  serve(options: {
    port: number;
    tls: { key: unknown; cert: unknown };
    fetch: (request: Request) => Response | Promise<Response>;
  }): BunTestServer;
};
