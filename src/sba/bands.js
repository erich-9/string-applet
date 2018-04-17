const $ = require("jquery"),
  H = require("../util/helper");

function Bands(A) {
  const instances = [[]], instancesNormalized = [[]],
    letterCompare = A.letters.compare,
    lettersCompare = Array.compare(letterCompare),
    stringNormalForm = A.strings.normalForm;

  let id = 0;

  function init() {
    Band.prototype.A = A;
    Band.prototype.get = Band.get;

    Band.n = 1;

    Band[Symbol.iterator] = H.twoDimIterator(instancesNormalized, compute);
  }

  function exportMethods() {
    Band.ofLength = ofLength;
    Band.normalForm = normalForm;
  }

  function compute(nMax) {
    if (A.isRepFinite())
      return;

    if (A.isDomestic())
      nMax = Math.min(nMax, A.elementaryBands.last().length);

    for (const x of [true, false])
      ofLength(nMax, x);

    A.strings.compute(nMax);

    for (; Band.n < nMax;) {
      for (const s of A.strings.ofLength(++Band.n, true)) {
        if (definesBandStartingWithInvDirChange(s.arg))
          Band.get(s.arg);
      }
    }
  }

  function ofLength(n, normalize = false) {
    const I = normalize ? instancesNormalized : instances;

    while (n >= I.length)
      I.push([]);

    return I[n];
  }

  function normalForm(letters) {
    let res = stringNormalForm(letters);

    for (let i = 1, n = letters.length; i < n; ++i) {
      const rot = stringNormalForm(letters.rotated(i));

      if (lettersCompare(res, rot) === 1)
        res = rot;
    }

    return res;
  }

  function definesBandStartingWithInvDirChange(letters) {
    if (letters.length < 2)
      return false;

    const l_f = letters.first(), l_l = letters.last();

    if (!l_f.dir || l_l.dir || l_f.source !== l_l.target)
      return false;

    // make sure it is not a non-trivial power of a string
    for (let i = 2, n = letters.length; i <= n / 2; ++i) {
      if (n % i !== 0)
        continue;

      const d = n / i;
      let j;

      for (j = 1; j < d; ++j) {
        for (let k = 0; k < i && j < d; ++k) {
          if (letterCompare(letters[k], letters[(j * i) + k]) !== 0) {
            j = d;
            break;
          }
        }
      }
      if (j !== d + 1)
        return false;
    }

    return true;
  }

  class Band {
    static get(arg, normalize = false) {
      const n = arg.length;

      if (normalize)
        arg = normalForm(arg);

      const I = ofLength(n),
        y = I.binaryFindIndex({ arg }, Band.compare);

      return y.found
        ? I[y.index]
        : new Band(
          { I, pos: y.index, normalized: normalize ? arg : undefined },
          arg
        );
    }

    static getById(id) {
      for (const ins of instances) {
        const res = ins.find(i => i.id === id);

        if (res)
          return res;
      }

      return undefined;
    }

    static compare(s1, s2) {
      return lettersCompare(s1.arg, s2.arg);
    }

    rotation(i) {
      return Band.get(this.arg.rotated(i));
    }

    // private constructor -> use get
    constructor(context, arg) {
      const normalized = context.normalized ? context.normalized : normalForm(arg);

      $.extend(this, {
        id, arg,
        string: A.strings.get(arg),
        length: arg.length,
        nf: arg === normalized
      });

      context.I.splice(context.pos, 0, this);
      ++id;

      if (this.nf)
        ofLength(this.length, true).insertSorted(this, Band.compare);

      $.extend(this, {
        rl: Band.get(this.string.rl.arg),
        normalized: Band.get(normalized)
      });
    }
  }

  H.addCachedMethods(Band, {
    toString() {
      return this.arg.map(l => l.toString()).join("");
    }
  });

  init();
  exportMethods();

  return Band;
}

module.exports = Bands;
