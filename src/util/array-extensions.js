Array.prototype.first = function() {
  return this[0];
};

Array.prototype.last = function() {
  return this[this.length - 1];
};

Array.prototype.lmod = function(pos, del, ...elements) {
  this.splice(pos, del, ...elements);

  return this;
};

Array.prototype.rmod = function(pos, del, ...elements) {
  this.splice(this.length - pos - del, del, ...elements);

  return this;
};

Array.prototype.merge = function() {
  return [].concat(...this);
};

Array.prototype.findAndRemove = function(x) {
  const i = this.findIndex(x);

  return i !== -1 ? this.splice(i, 1)[0] : undefined;
};

Array.prototype.binaryFind = function(x, compareFunc) {
  const y = this.binaryFindIndex(x, compareFunc);

  return y.found ? this[y.index] : undefined;
};

Array.prototype.binaryFindAndRemove = function(x, compareFunc) {
  const y = this.binaryFindIndex(x, compareFunc);

  return y.found ? this.splice(y.index, 1)[0] : undefined;
};

Array.prototype.binaryFindIndex = function(x, compareFunc) {
  let i, iMin = 0, iMax = this.length - 1;
  let cmp;
  let y;

  while (iMin <= iMax) {
    i = (iMin + iMax) / 2 | 0;
    y = this[i];

    cmp = compareFunc(x, y);
    if (cmp === 1) {
      iMin = i + 1;
    }
    else if (cmp === -1) {
      iMax = i - 1;
    }
    else {
      return {
        found: true,
        index: i
      };
    }
  }

  return {
    found: false,
    index: cmp === 1 ? i + 1 : i
  };
};

Array.prototype.insertSorted = function(x, compareFunc, multi = false) {
  const y = this.binaryFindIndex(x, compareFunc);

  if (!y.found || multi) {
    this.splice(y.index, 0, x);

    return true;
  }

  return false;
};

Array.prototype.rotated = function(i) {
  const rot = [];

  for (let j = 0, n = this.length; j < n; ++j)
    rot.push(this[(j + i) % n]);

  return rot;
};

Array.compare = function(compareFunc) {
  return function(x1, x2) {
    const n1 = x1.length, n2 = x2.length;

    if (n1 < n2)
      return -1;
    if (n2 < n1)
      return 1;

    for (let i = 0; i < n1; ++i) {
      const res = compareFunc(x1[i], x2[i]);

      if (res !== 0)
        return res;
    }

    return 0;
  };
};

Set.prototype.find = function(func) {
  for (const s of this) {
    if (func(s, this))
      return s;
  }

  return undefined;
};
