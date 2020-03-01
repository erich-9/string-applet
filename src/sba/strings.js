import $ from "jquery";
import H from "../util/helper";
import LH from "./letter-helper";
import Module from "./module";

function Strings(A) {
  const instances = [], instancesNormalized = [],
    letterEndsCompare = A.letterEnds.compare,
    lettersCompare = Array.compare(A.letters.compare);

  let id = 0;

  function init() {
    String.prototype.A = A;
    String.prototype.get = String.get;

    String.n = 1;

    String[Symbol.iterator] = H.twoDimIterator(instancesNormalized, compute);

    for (const v of A.stringQuiver.vertices)
      String.get(v);

    for (const a of A.stringQuiver.arrows)
      String.get([a]);
  }

  function exportMethods() {
    String.compute = compute;
    String.ofLength = ofLength;
    String.normalForm = normalForm;
  }

  function compute(nMax) {
    for (; String.n < nMax; ++String.n) {
      const oldPaths = ofLength(String.n);

      if (oldPaths.length === 0)
        return;

      for (const oldPath of oldPaths) {
        for (const a of A.stringQuiver.as_o[oldPath.target.id])
          String.get(oldPath.arg.concat([a]));
      }
    }
  }

  function ofLength(n, normalize = false) {
    const I = normalize ? instancesNormalized : instances;

    while (n >= I.length)
      I.push([]);

    return I[n];
  }

  function normalForm(arg) {
    if (!arg.length)
      return arg.normalized;

    const inv = LH.invert(arg);

    return lettersCompare(arg, inv) === 1 ? inv : arg;
  }

  class String {
    static get(arg, normalize = false) {
      if (!arg)
        return null;

      const isTrivial = !Array.isArray(arg),
        n = isTrivial ? 0 : arg.length;

      if (isTrivial) {
        if (!arg.v)
          arg = A.letterEnds.get(arg);
      }
      else if (n === 0) {
        return null;
      }

      if (normalize)
        arg = normalForm(arg);

      const I = ofLength(n),
        y = I.binaryFindIndex({ arg, isTrivial }, String.compare);

      return y.found
        ? I[y.index]
        : new String(
          { I, pos: y.index, normalized: normalize ? arg : undefined },
          arg,
          isTrivial
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
      const cmp = H.compare(s1.length, s2.length);

      if (cmp !== 0)
        return cmp;

      if (s1.isTrivial)
        return letterEndsCompare(s1.arg, s2.arg);

      return lettersCompare(s1.arg, s2.arg);
    }

    isSemiSimple() {
      return this.isTrivial;
    }

    vertex(i) {
      if (i === 0)
        return this.source;

      return this.arg[i - 1].target;
    }

    sub(i, j) {
      return String.get(LH.subLetters(this.arg, i, j));
    }

    head(j) {
      return this.sub(0, j);
    }

    tail(i) {
      return this.sub(i, this.length);
    }

    prepend(other) {
      if (this.isTrivial)
        return other;
      if (other.isTrivial)
        return this;

      return String.get(LH.flatten(LH.concat(...other.arg, ...this.arg)));
    }

    append(other) {
      return other.prepend(this);
    }

    topSubs() {
      return subs(this, true);
    }

    socSubs() {
      return subs(this, false);
    }

    tauPos() {
      if (this._tauPos === undefined)
        computeARSequence(this, true);

      return this._tauPos;
    }

    tauNeg() {
      if (this._tauNeg === undefined)
        computeARSequence(this, false);

      return this._tauNeg;
    }

    predsAR() {
      if (!this._predsAR)
        computeARSequence(this, true);

      return this._predsAR;
    }

    succsAR() {
      if (!this._succsAR)
        computeARSequence(this, false);

      return this._succsAR;
    }

    // private constructor -> use get
    constructor(context, arg, isTrivial) {
      const normalized = context.normalized ? context.normalized : normalForm(arg);

      $.extend(this, {
        id, arg, isTrivial,
        nf: arg === normalized
      });

      context.I.splice(context.pos, 0, this);
      ++id;

      if (!isTrivial) {
        $.extend(this, {
          length: arg.length,

          fst: arg.first(),
          lst: arg.last(),

          rl: String.get(LH.invert(arg))
        });

        for (const x of ["source", "sop", "sid"])
          this[x] = this.fst[x];

        for (const x of ["target", "eop", "eid"])
          this[x] = this.lst[x];

        this.normalized = this.nf ? this : this.rl;
      }
      else {
        $.extend(this, {
          length: 0,

          source: arg,
          target: arg,

          fst: null,
          lst: null,

          rl: String.get(arg.rl),
          td: String.get(arg.td),

          sop: arg.sop,
          sid: arg.sid,

          eop: arg.eop,
          eid: arg.eid
        });

        this.normalized = String.get(normalized);
      }

      if (this.nf)
        ofLength(this.length, true).insertSorted(this, String.compare);
    }
  }

  const cachedMethods = {
    letterLength() {
      return this.isTrivial ? 0 : this.arg.reduce((a, l) => a + l.length, 0);
    },

    sourceString() {
      return String.get(this.source);
    },

    targetString() {
      return String.get(this.target);
    },

    first() {
      return this.isTrivial ? null : String.get([this.fst]);
    },

    last() {
      return this.isTrivial ? null : String.get([this.lst]);
    },

    isElementary() {
      if (this.isTrivial)
        return true;

      const L = this.arg, n = this.length, V = new Set();

      for (let i = 0; i < n; ++i) {
        V.add(L[i].source);

        if (V.size !== i + 1)
          return 0;
      }

      V.add(this.target);

      if (V.size === n + 1)
        return 1;

      return this.source === this.target ? -1 : 0;
    },

    isProjective() {
      return projinj(this, true);
    },

    isInjective() {
      return projinj(this, false);
    },

    supp() {
      return supp(this);
    },

    top() {
      return topsoc(this, true);
    },

    soc() {
      return topsoc(this, false);
    },

    projectiveCover() {
      return this.top().map(ind => ind.arg.v.P);
    },

    injectiveHull() {
      return this.soc().map(ind => ind.arg.v.I);
    },

    omegaPos() {
      return omega(this, true);
    },

    omegaNeg() {
      return omega(this, false);
    },

    rad() {
      return radsqt(this, true);
    },

    sqt() {
      return radsqt(this, false);
    },

    isTauPosRigid() {
      return this.module().homVanishes(this.tauPos());
    },

    endDim() {
      return this.module().homDim(this);
    },

    module() {
      return Module.from(this, A);
    },

    toText() {
      return this.isTrivial
        ? this.arg.toString()
        : this.arg.map(l => l.toString()).join("");
    },

    toString() {
      return this.bandNormalForm().reduce((a, x) => a + bnfcToHtml(x), "");
    },

    bandNormalForm() {
      const x = {
        sL: this.sourceString(),
        bB: null,
        bE: 0,
        sR: this.targetString()
      };

      if (this.isTrivial)
        return [x];

      for (let i = 2, n = this.length; i <= n; ++i) {
        outer:
        for (const B of A.bands.ofLength(i, false)) {
          for (let j = 0; j < i; ++j) {
            if (B.arg[j] === this.arg[j])
              continue;
            continue outer;
          }

          return bnfPrepend(
            $.extend(x, { bB: B, bE: 1 }),
            this.tail(i).bandNormalForm()
          );
        }
      }

      return bnfPrepend(
        $.extend(x, { sR: this.head(1) }),
        this.tail(1).bandNormalForm()
      );
    }
  };

  for (const x of ["left", "right"]) {
    for (const y of ["", "Max"]) {
      for (const z of ["Reduction", "ExtensionSame", "ExtensionDiff"]) {
        const w = x + y + z;

        cachedMethods[w] = function() {
          return String.get(LH[w](this.arg));
        };
      }
    }
  }

  H.addCachedMethods(String, cachedMethods);

  init();
  exportMethods();

  return String;
}

function projinj(_that, proj) {
  return proj
    ? _projinj(_that, "sid", "eid", "top")
    : _projinj(_that, "sop", "eop", "soc");
}

function _projinj(_that, s, e, topsoc) {
  if (_that.length > 2 || !_that[s] || !_that[e])
    return false;

  const M = _that[topsoc]();

  if (M.size !== 1)
    return false;

  return M.summands.first().ind.arg.v;
}

function supp(_that) {
  const L = _that.arg, n = _that.length;
  const res = new Module(_that.A);

  for (let i = 0; i < n; ++i) {
    for (let j = 0, m = L[i].length; j < m; ++j)
      res.add(_that.get(L[i].vertex(j)));
  }

  res.add(_that.targetString());

  return res;
}

function topsoc(_that, top) {
  if (_that.isTrivial && _that.arg.top !== top)
    _that = _that.td;

  const L = _that.arg, n = _that.length;
  const res = new Module(_that.A);

  const sit = _that.source.top === top;
  const eit = _that.target.top === top;

  const add = smd => res.add(_that.get(smd));

  for (let i = sit ? 0 : 1; i < n; i += 2)
    add(L[i].source);

  if (eit)
    add(_that.target);

  return res;
}

function radsqt(_that, top) {
  if (_that.isTrivial && _that.arg.top !== top)
    _that = _that.td;

  const L = _that.arg, n = _that.length;
  const res = new Module(_that.A);

  const sit = _that.source.top === top;
  const eit = _that.target.top === top;

  if (!sit)
    addSmd(_that, res, L.first().red_r);

  for (let i = sit ? 1 : 2; i < n; i += 2)
    addSmd(_that, res, L[i - 1].red_l, L[i].red_r);

  if (!eit)
    addSmd(_that, res, L.last().red_l);

  return res;
}

function omega(_that, top) {
  if (_that.isTrivial && _that.arg.top !== top)
    _that = _that.td;

  const PI = top ? "P" : "I";

  const L = _that.arg, n = _that.length;
  const res = new Module(_that.A);

  const sit = _that.source.top === top;
  const eit = _that.target.top === top;

  const om_l = (sit ? _that.source.max_ext_l_ : _that.fst.com_ext_l).rl.red_l;
  const om_r = (eit ? _that.target.max_ext_r_ : _that.lst.com_ext_r).rl.red_r;

  const smd = [];

  if (om_l)
    smd.push(om_l);

  for (let i = sit ? 1 : 2; i < n; i += 2) {
    const M = L[i - 1].source.v[PI];

    if (!M.isBiserial)
      omegaAddSmd(_that, res, smd);

    smd.push(L[i - 1].com_ext_r.rl, L[i].com_ext_l.rl);
  }

  const M = (eit ? _that.target : _that.lst.source).v[PI];

  if (!M.isBiserial)
    omegaAddSmd(_that, res, smd);

  if (om_r)
    smd.push(om_r);

  omegaAddSmd(_that, res, smd);

  return res;
}

function omegaAddSmd(_that, res, smd) {
  if (smd.length === 0)
    return;

  addSmd(_that, res, ...smd);
  smd.length = 0;
}

function addSmd(_that, res, ...smd) {
  res.add(_that.get(LH.concat(...smd)));
}

function subs(_that, top) {
  const t = top ? "top" : "soc";

  if (!_that._subs)
    _that._subs = {};

  if (!_that._subs[t]) {
    const M = subsIncAvdSource(_that, top);

    _that._subs[t] = (new Module(_that.A))
      .concat(M.incSource)
      .concat(M.avdSource);
  }

  return _that._subs[t];
}

function subsIncAvdSource(_that, top) {
  const t = top ? "top" : "soc";

  if (!_that._subsIncAvdSource)
    _that._subsIncAvdSource = {};

  if (!_that._subsIncAvdSource[t])
    _that._subsIncAvdSource[t] = _subsIncAvdSource(_that, top);

  return _that._subsIncAvdSource[t];
}

function _subsIncAvdSource(_that, top) {
  const res = {
    incSource: new Module(_that.A, false),
    avdSource: new Module(_that.A, false)
  };

  if (_that.isTrivial) {
    res.incSource.add(_that);
  }
  else {
    let X, L, R = _that;

    if (_that.source.top === top) {
      X = _that.first();
      R = R.leftMaxReduction();
      L = X.rightReduction();
    }
    else {
      X = _that.sourceString();
    }

    R = R.leftReduction();
    X = X.rightExtensionDiff();

    if (L) {
      const M_L = subsIncAvdSource(L, top);

      res.incSource.concat(M_L.incSource);
      res.avdSource.concat(M_L.avdSource);
    }

    if (R) {
      res.avdSource.concat(subs(R, top));

      subsIncAvdSource(R, top).incSource.forEach((ind, mult) => {
        res.incSource.add(X.append(ind), mult);
      });
    }
    else {
      res.incSource.add(_that);
    }
  }

  return res;
}

function computeARSequence(_that, endingHere) {
  if (endingHere)
    _computeARSequence(_that, true, "_tauPos", "_predsAR");
  else
    _computeARSequence(_that, false, "_tauNeg", "_succsAR");
}

function _computeARSequence(_that, top, _tau, _mid) {
  if (_that.rl[_tau]) {
    _that[_tau] = _that.rl[_tau];
    _that[_mid] = _that.rl[_mid];

    return;
  }

  if (_that.isTrivial && _that.arg.top !== top) {
    _computeARSequence(_that.td, top, _tau, _mid);

    _that[_tau] = _that.td[_tau];
    _that[_mid] = _that.td[_mid];

    return;
  }

  const sit = _that.source.top === top;
  const eit = _that.target.top === top;

  const tau = _that.isTrivial ? [] : _that.arg.slice();

  const mid_l = tau.slice();
  const mid_r = tau.slice();

  if (sit) {
    for (const x of [tau, mid_l])
      x.lmod(0, 0, _that.source);
  }

  if (eit) {
    for (const x of [tau, mid_r])
      x.rmod(0, 0, _that.target);
  }

  const l_ext = tau.first().ext_l;

  if (l_ext) {
    for (const x of [tau, mid_l])
      x.lmod(0, 1, l_ext.source.max_ext_l, l_ext);
  }

  const r_ext = tau.last().ext_r;

  if (r_ext) {
    for (const x of [tau, mid_r])
      x.rmod(0, 1, r_ext, r_ext.target.max_ext_r);
  }

  if (!l_ext) {
    for (const x of [tau, mid_l]) {
      if (x.length < 2)
        x.length = 0;
      else
        x.lmod(0, 2, x[1].red_l);
    }
  }

  if (!r_ext) {
    for (const x of [tau, mid_r]) {
      if (x.length < 2)
        x.length = 0;
      else
        x.rmod(0, 2, x[x.length - 2].red_r);
    }
  }

  _that[_tau] = _that.get(LH.concat(...tau), true);

  const M = _that[_mid] = new Module(_that.A);

  for (const x of [mid_l, mid_r]) {
    if (x.length > 0)
      M.add(_that.get(LH.concat(...x)));
  }
}

function bnfPrepend(x, bnf) {
  if (bnf.length === 0)
    return [x];

  const res = bnf.slice();
  const y = $.extend({}, res.first());

  res[0] = y;

  bnfcNormalize(x);

  y.sL = y.sL.prepend(x.sR, false);
  x.sR = y.sL.sourceString();

  bnfcNormalize(y);

  if (y.sL.isTrivial) {
    if (x.bE === 0 || y.bE === 0 || x.bB === y.bB) {
      y.sL = x.sL;
      y.bB = y.bB ? y.bB : x.bB;
      y.bE = x.bE + y.bE;

      return res;
    }
  }

  if (x.bE !== 0)
    res.unshift(x);

  return res;
}

function bnfcNormalize(x) {
  if (x.bE !== 0)
    return;

  x.sR = x.sR.prepend(x.sL, false);
  x.sL = x.sR.sourceString();
}

function bnfcToHtml(x) {
  if (x.bE === 0 && x.sL.isTrivial)
    return x.sR.toText();

  let res = "";

  if (!x.sL.isTrivial)
    res += x.sL.toText();

  if (x.bE === 1)
    res += x.bB.toString();
  else if (x.bE > 1)
    res += `(${x.bB.toString()})<sup>${x.bE}</sup>`;

  if (!x.sR.isTrivial)
    res += x.sR.toText();

  return res;
}

export default Strings;
