import "@testing-library/jest-dom";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Polyfill/Mock for Radix UI components that use these browser APIs
if (typeof window.getSelection === 'undefined') {
  Object.defineProperty(window, 'getSelection', {
    value: () => ({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
    }),
  });
}

if (typeof window.PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: any) {
      super(type, props);
    }
  }
  (window as any).PointerEvent = PointerEvent;
}

if (typeof window.ResizeObserver === 'undefined') {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
  }));
}

// Add missing methods to HTMLElement prototype instead of replacing the class
if (typeof window.HTMLElement !== 'undefined') {
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  }
}
