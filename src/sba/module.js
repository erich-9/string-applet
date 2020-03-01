import $ from "jquery";
import H from "../util/helper";

class Module {
  static compare(M, N) {
    if (M.basicSize < N.basicSize)
      return -1;
    if (N.basicSize < M.basicSize)
      return +1;

    for (let i = 0, n = M.basicSize; i < n; ++i) {
      const M_ = M.summands[i], N_ = N.summands[i],
        cmp = compare(M.A, M_.ind, N_.ind);

      if (cmp !== 0)
        return cmp;

      if (M_.mult < N_.mult)
        return -1;
      if (N_.mult < M_.mult)
        return +1;
    }

    return 0;
  }

  static P(A, v) {
    return (new Module(A)).add(v.P);
  }

  static I(A, v) {
    return (new Module(A)).add(v.I);
  }

  static S(A, v) {
    return (new Module(A)).add(v.S);
  }

  static stdGenerator(A) {
    return (new Module(A))
      .insertFrom(A.quiver.vertices, v => v.P);
  }

  static stdCogenerator(A) {
    return (new Module(A))
      .insertFrom(A.quiver.vertices, v => v.I);
  }

  static sumOfSimples(A) {
    return (new Module(A))
      .insertFrom(A.quiver.vertices, v => v.S);
  }

  static from(arg, A, clone = false) {
    if (arg instanceof Module)
      return clone ? arg.clone() : arg;

    if (A) {
      if (!arg)
        return new Module(A);

      if (arg instanceof A.strings || arg instanceof A.BPI)
        return (new Module(arg.A)).add(arg);

      if (arg === A)
        return Module.stdGenerator(A);
    }

    return null;
  }

  constructor(A, normalize = true) {
    $.extend(this, {
      A,
      normalize,

      size: 0,
      basicSize: 0,

      summands: [],

      compare: (x, y) => compare(A, x.ind, y.ind)
    });
  }

  clone() {
    return $.extend(new Module(this.A, this.normalize), {
      size: this.size,
      basicSize: this.basicSize,
      summands: this.summands.slice()
    });
  }

  equals(other) {
    if (this.size !== other.size || this.basicSize !== other.basicSize)
      return false;

    for (let i = 0, n = this.size; i < n; ++i) {
      const x = this.summands[i], y = other.summands[i];

      if (x.ind !== y.ind || x.mult !== y.mult)
        return false;
    }

    return true;
  }

  multiplicity(ind) {
    if (this.normalize)
      ind = ind.normalized;

    const y = this.summands.binaryFind({ ind }, this.compare);

    return y ? y.mult : 0;
  }

  add(ind, mult = 1) {
    if (this.normalize)
      ind = ind.normalized;

    this.size += mult;

    const y = this.summands.binaryFindIndex({ ind }, this.compare);

    if (!y.found) {
      this.summands.splice(y.index, 0, { ind, mult });
      ++this.basicSize;

      this.updateAfterFirstAdded(ind);
      this.updateAfterSomeAdded(ind, mult);
    }
    else {
      this.summands[y.index].mult += mult;

      this.updateAfterSomeAdded(ind, mult);
    }

    return this;
  }

  insertFrom(iterable, ind2ind = x => x) {
    for (const x of iterable)
      this.add(ind2ind(x));

    return this;
  }

  multiply(factor) {
    if (factor !== 1) {
      this.size *= factor;

      for (const smd of this.summands) {
        smd.mult *= factor;

        this.updateAfterSomeAdded(smd.ind, (smd.mult - 1) * factor);
      }
    }

    return this;
  }

  remove(ind, mult = Infinity) {
    if (this.normalize)
      ind = ind.normalized;

    const y = this.summands.binaryFindIndex({ ind }, this.compare);

    if (!y.found)
      return 0;

    const z = this.summands[y.index];

    if (z.mult > mult) {
      z.mult -= mult;
      this.size -= mult;

      this.updateAfterSomeRemoved(ind, mult);

      return mult;
    }
    else {
      this.size -= z.mult;
      --this.basicSize;
      this.summands.splice(y.index, 1);

      this.updateAfterSomeRemoved(ind, z.mult);
      this.updateAfterLastRemoved(ind);

      return z.mult;
    }
  }

  concat() {
    for (let i = 0, n = arguments.length; i < n; ++i)
      arguments[i].forEach((ind, mult) => this.add(ind, mult));

    return this;
  }

  decat() {
    for (let i = 0, n = arguments.length; i < n; ++i)
      arguments[i].forEach((ind, mult) => this.remove(ind, mult));

    return this;
  }

  toString() {
    return this.summands.map(
      d => (d.mult > 1 ? `${d.mult} x ` : "") + d.ind.toString()
    ).join(", ");
  }

  forEach(callback) {
    this.summands.forEach((x, i) => callback(x.ind, x.mult, i));
  }

  map(ind2ind, normalize = true) {
    const res = new Module(this.A, normalize);

    this.forEach((ind, mult) => res.add(ind2ind(ind), mult));

    return res;
  }

  filter(filterFunc, normalize = true) {
    const res = new Module(this.A, normalize);

    this.forEach((ind, mult) => {
      if (filterFunc(ind, mult))
        res.add(ind, mult);
    });

    return res;
  }

  [Symbol.iterator]() {
    const it = this.summands[Symbol.iterator]();

    return {
      next() {
        const { done, value } = it.next();

        return { done, value: done ? undefined : value.ind };
      }
    };
  }

  find(func) {
    for (const item of this.summands) {
      if (func(item.ind, item.mult))
        return item;
    }

    return undefined;
  }

  has(x) {
    if (this.normalize)
      x = x.normalized;

    return this.find(x_ => x_ === x);
  }

  reduce(callback, x0) {
    let res = x0;

    this.summands.forEach(x =>
      res = callback(res, x.ind, x.mult)
    );

    return res;
  }

  isZero() {
    return this.size === 0;
  }

  homVanishes(other) {
    if (other) {
      const p = this.topSubs(), d = other.socSubs();

      for (const x of p) {
        for (const y of d) {
          if (x === y)
            return false;
        }
      }
    }

    return true;
  }

  homDim(other) {
    let res = 0;

    if (other) {
      const p = this.topSubs(), d = other.socSubs();

      for (const x of p.summands) {
        for (const y of d.summands) {
          if (x.ind === y.ind)
            res += x.mult * y.mult;
        }
      }
    }

    return res;
  }
}

const cachedMethods = {
  projDim() {
    return homologicalDim.call(this, true);
  },

  injDim() {
    return homologicalDim.call(this, false);
  }
};

const concernedAboutPresence = [
  "isSemiSimple",
  "isProjective",
  "isInjective",
  "isTauPosRigid"
];

const concernedAboutMultiplicity = [
  "supp",
  "top",
  "soc",
  "rad",
  "sqt",
  "projectiveCover",
  "injectiveHull",
  "topSubs",
  "socSubs",
  "omegaPos",
  "omegaNeg",
  "tauPos",
  "tauNeg"
];

for (const x of concernedAboutPresence) {
  cachedMethods[x] = function() {
    return allOverInd(this, v => v[x]());
  };
}

for (const x of concernedAboutMultiplicity) {
  cachedMethods[x] = function() {
    return mapOverInd(this, v => v[x]());
  };
}

H.addCachedMethods(Module, cachedMethods);

Module.prototype.updateAfterFirstAdded = function(ind) {
  for (const x of concernedAboutPresence) {
    if (this[`_${x}`] !== undefined)
      this[`_${x}`] = ind[x]();
  }
};

Module.prototype.updateAfterLastRemoved = function(ind) {
  for (const x of concernedAboutPresence) {
    if (this[`_${x}`] === undefined)
      continue;

    if (this[`_${x}`] !== undefined && !ind[x]())
      this[`_${x}`] = undefined;
  }
};

Module.prototype.updateAfterSomeAdded = function(ind, mult) {
  for (const x of concernedAboutMultiplicity) {
    if (this[`_${x}`] !== undefined) {
      Module.from(ind[x](), this.A).forEach(
        (ind, m) => this[`_${x}`].add(ind, mult * m)
      );
    }
  }
};

Module.prototype.updateAfterSomeRemoved = function(ind, mult) {
  for (const x of concernedAboutMultiplicity) {
    if (this[`_${x}`] !== undefined) {
      Module.from(ind[x](), this.A).forEach(
        (ind, m) => this[`_${x}`].remove(ind, mult * m)
      );
    }
  }
};

function mapOverInd(mod, indToMod) {
  const res = new Module(mod.A, mod.normalize);

  for (const item of mod.summands) {
    const mod_ = Module.from(indToMod(item.ind), mod.A);

    if (mod_)
      mod_.forEach((ind, m) => res.add(ind, item.mult * m));
  }

  return res;
}

function allOverInd(mod, func) {
  for (const ind of mod) {
    if (!func(ind))
      return false;
  }

  return true;
}

function homologicalDim(proj) {
  return proj
    ? _homologicalDim.call(this, "omegaPos", "isProjective")
    : _homologicalDim.call(this, "omegaNeg", "isInjective");
}

// TODO: adjust once finDim() is also implemented for special biserial
function _homologicalDim(omega, projinj) {
  const fd = this.A.finDim(), n = fd !== null ? fd : this.A.quiver.arrows.length;

  // eslint-disable-next-line consistent-this
  for (let syz = this, d = 0; d <= n; ++d, syz = syz[omega]()) {
    if (syz[projinj]())
      return d;
  }

  return fd !== null ? Infinity : null;
}

function compare(A, x, y) {
  const xIsBiserial = Boolean(x.isBiserial), yIsBiserial = Boolean(y.isBiserial);

  if (xIsBiserial !== yIsBiserial)
    return H.compare(xIsBiserial, yIsBiserial);

  if (!xIsBiserial && !yIsBiserial)
    return A.strings.compare(x, y);

  return A.BPI.compare(x, y);
}

export default Module;
