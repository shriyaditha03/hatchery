import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

window.HTMLElement.prototype.scrollIntoView = function() {};
window.HTMLElement.prototype.hasPointerCapture = function() { return false; };
window.HTMLElement.prototype.releasePointerCapture = function() {};
window.HTMLElement.prototype.setPointerCapture = function() {};

class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props?.button || 0;
    this.ctrlKey = props?.ctrlKey || false;
    this.pointerType = props?.pointerType || 'mouse';
  }
}

window.PointerEvent = MockPointerEvent as any;
