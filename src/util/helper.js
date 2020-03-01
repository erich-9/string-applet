import "./array-extensions";

import $ from "jquery";

function randomInt(from, to) {
  const n = (to - from);

  return Math.floor((Math.random() * n) % n) + from;
}

function randomKey(obj) {
  const x = Object.keys(obj);

  return x[randomInt(0, x.length)];
}

function addCachedMethods(Class, cachedMethods) {
  $.each(cachedMethods, (k, v) => {
    Class.prototype[k] = function() {
      if (this[`_${k}`] === undefined)
        this[`_${k}`] = v.call(this);

      return this[`_${k}`];
    };
  });
}

function compare(x1, x2) {
  return x1 < x2 ? -1 : x2 < x1 ? 1 : 0;
}

function lexComp(x1, y1, x2, y2) {
  if (lexLess(x1, y1, x2, y2))
    return -1;
  if (lexLess(x2, y2, x1, y1))
    return +1;

  return 0;
}

function lexLess(x1, y1, x2, y2) {
  return x1 < x2 || (x1 === x2 && y1 < y2);
}

function polarCoordinates(x, y) {
  if (x === 0 && y === 0) {
    return {
      r: 0,
      arg: null
    };
  }

  const r = Math.sqrt((x * x) + (y * y));

  return {
    r,
    arg:
      x < 0 && y === 0
        ? 180
        : Math.atan(y / (x + r)) * 360 / Math.PI
  };
}

let inIE;

function runningInIE() {
  if (inIE === undefined && navigator)
    inIE = /MSIE \d|Trident.*rv:/.test(navigator.userAgent);

  return inIE;
}

function twoDimIterator(array, func) {
  return () => {
    let n = -1, it = [][Symbol.iterator]();

    return {
      next() {
        let x = it.next();

        while (x.done) {
          if (func)
            func(++n);

          if (array.length > n) {
            it = array[n][Symbol.iterator]();
            x = it.next();
          }
          else {
            return { done: true, value: undefined };
          }
        }

        return x;
      }
    };
  };
}

function withDefault(x, dft, func) {
  return x !== null && x !== undefined ? (func ? func(x) : x) : dft;
}

function zeroMatrix(n, m) {
  const res = new Array(n);

  if (m === undefined)
    m = n;

  for (let i = 0; i < n; ++i) {
    const row = res[i] = new Array(m);

    for (let j = 0; j < m; ++j)
      row[j] = 0;
  }

  return res;
}

export default {
  addCachedMethods,
  compare,
  lexComp,
  lexLess,
  polarCoordinates,
  randomInt,
  randomKey,
  runningInIE,
  twoDimIterator,
  withDefault,
  zeroMatrix
};
