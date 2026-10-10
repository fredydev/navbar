// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// React Flow mesure ses nœuds : jsdom n'a ni ResizeObserver ni DOMMatrixReadOnly.
class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe(target) {
    this.callback([{ target, contentRect: { width: 1000, height: 800 } }]);
  }
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

class DOMMatrixReadOnly {
  constructor(transform) {
    const scale = transform && transform.match(/scale\(([1-9.])\)/);
    this.m22 = scale ? +scale[1] : 1;
  }
}
global.DOMMatrixReadOnly = DOMMatrixReadOnly;

Object.defineProperties(global.HTMLElement.prototype, {
  offsetHeight: { get() { return parseFloat(this.style.height) || 1; } },
  offsetWidth: { get() { return parseFloat(this.style.width) || 1; } },
});
global.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
