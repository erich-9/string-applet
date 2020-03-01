import "../util/array-extensions";

import $ from "jquery";
import Bands from "./bands";
import Biserials from "./biserials";
import H from "../util/helper";
import Matrix from "../util/matrix";
import Module from "./module";
import LetterEnds from "./letter-ends";
import Letters from "./letters";
import Path from "../quiver/path";
import Quiver from "../quiver/quiver";
import Silter from "./silter";
import Strings from "./strings";

class SpecialBiserialAlgebra {
  constructor(quiver, relations) {
    initQuiver.call(this, quiver);
    initRelations.call(this, relationsFromString(relations));

    initArrows.call(this);
    initPaths.call(this);

    initStringQuiver.call(this);
    initStringsAndBands.call(this);
  }

  ARQuiver(nMax = 2) {
    nMax = Math.max(2, nMax, ...this.elementaryStrings.map(s => s.length));

    const res = new Quiver(),
      S = this.strings;

    function addVertex(s, VV) {
      const v = res.vertex(s);

      if (!v)
        VV.push(res._addVertex(s));

      return v;
    }

    function addArrow(s, t, trans = false) {
      s = res.vertex(s);
      t = res.vertex(t);

      if (!s || !t)
        return;

      const a = res.as_o[s.id].find(a_ => a_.target === t && a_.trans === trans);

      if (!a)
        res.addArrow(s, t, "").trans = trans;
    }

    function addVertices(V) {
      const VV = [];

      for (const s of V) {
        addVertex(s, VV);

        if (!s.isProjective())
          addVertex(s.tauPos(), VV);
        for (const t of s.predsAR())
          addVertex(t, VV);

        if (!s.isInjective())
          addVertex(s.tauNeg(), VV);
        for (const t of s.succsAR())
          addVertex(t, VV);
      }

      return VV;
    }

    function addInArrows(VV) {
      for (const s of VV) {
        for (const t of s.predsAR())
          addArrow(t, s);
        if (!s.isProjective())
          addArrow(s, s.tauPos(), true);
      }
    }

    function addOutArrows(VV) {
      for (const s of VV) {
        for (const t of s.succsAR())
          addArrow(s, t);
        if (!s.isInjective())
          addArrow(s.tauNeg(), s, true);
      }
    }

    for (let i = 0; i <= nMax; ++i)
      addVertices(S.ofLength(i, true));

    addInArrows(res.vertices);

    res.addNextLayer = function() {
      const nMax = ++this.maxStringLength;

      S.compute(nMax);

      const strings = S.ofLength(nMax, true),
        VV = addVertices(strings);

      addInArrows(VV);
      addOutArrows(VV);
    };

    res.maxStringLength = nMax;

    return res;
  }
}

H.addCachedMethods(SpecialBiserialAlgebra, {
  isStringAlgebra() {
    return this.commutativityRelations.length === 0;
  },

  isGentle() {
    if (!this.isStringAlgebra())
      return false;

    const Q = this.quiver;

    for (const r of this.zeroRelations) {
      if (r.length !== 2)
        return false;
    }

    for (const a of Q.arrows) {
      if (!a.pred_awd && Q.as_i[a.source.id].length === 2)
        return false;
      if (!a.succ_awd && Q.as_o[a.target.id].length === 2)
        return false;
    }

    return true;
  },

  isSemiSimple() {
    return this.quiver.arrows.length === 0;
  },

  isSelfInjective() {
    return this.quiver.vertices.every(v => v.P.isInjective());
  },

  isRepFinite() {
    return this.elementaryCyclicStrings.length === 0;
  },

  isDomestic() {
    const V = new Set();
    let n = 0;

    for (const b of this.elementaryBands) {
      for (const l of b.arg) {
        V.add(l.source.id);
        if (V.size !== ++n)
          return false;
      }
    }

    return true;
  },

  numberOfIndecomposables() {
    return this.isRepFinite()
      ? this.elementaryStrings.length + this.biserials.length
      : Infinity;
  },

  dim() {
    return this.cartanMatrixArray().reduce((a, col) => col.reduce((b, d) => b + d, 0) + a, 0);
  },

  domDim() {
    if (this.isSelfInjective())
      return Infinity;

    let syz = Module.stdGenerator(this);

    for (let d = 0; ; ++d, syz = syz.omegaNeg()) {
      if (!syz.injectiveHull().isProjective())
        return d;
    }
  },

  finDim() {
    const Q = this.smallOmegaQuiver(this.isStringAlgebra() ? 2 : undefined),
      N = Q.vertices.length;

    let changed = true;

    for (const v of Q.vertices)
      v._maxPSH = 0;

    while (changed) {
      changed = false;

      for (const a of Q.arrows) {
        const m = a.source._maxPSH;
        const n = a.target._maxPSH + 1;

        if (n <= m)
          continue;

        a.source._maxPSH = n >= N ? Infinity : n;

        changed = true;
      }
    }

    let res = 0;

    for (const v of Q.vertices) {
      if (v._maxPSH === Infinity) {
        this._glDim = Infinity;
        continue;
      }

      if (v._maxPSH > res)
        res = v._maxPSH;
    }

    return this.isStringAlgebra() || this.isRepFinite() ? res : null;
  },

  glDim() {
    return Module.sumOfSimples(this).projDim();
  },

  lInjDim() {
    return Module.stdGenerator(this).injDim();
  },

  rInjDim() {
    return Module.stdCogenerator(this).projDim();
  },

  kgDim() {
    if (this.isRepFinite())
      return 0;
    else if (!this.isStringAlgebra())
      return null;
    else if (this.isDomestic())
      return this.bridgeQuiver().maxPathLength() + 2;
    else
      return Infinity;
  },

  repDim() {
    return this.isSemiSimple() ? 0 : (this.isRepFinite() ? 2 : 3);
  },

  cartanMatrix() {
    return new Matrix(this.cartanMatrixArray());
  },

  cartanMatrixArray() {
    const Q = this.quiver,
      res = H.zeroMatrix(Q.vertices.length),
      id2ix = {};

    Q.vertices.forEach((v, i) => id2ix[v.id] = i);

    for (const paths of this.paths) {
      for (const path of paths)
        ++res[id2ix[path.target.id]][id2ix[path.source.id]];
    }

    for (const r of this.commutativityRelations) {
      const path = r[0];

      ++res[id2ix[path.target.id]][id2ix[path.source.id]];
    }

    return res;
  },

  nakayamaPermutation() {
    if (!this.isSelfInjective())
      return null;

    return this.quiver.vertices.map(v => {
      return { P: v, I: v.P.isInjective() };
    });
  },

  agInvariant() {
    if (!this.isGentle())
      return null;

    const res = [],
      cmp = (x, y) => H.lexComp(x.n, x.m, y.n, y.m);

    for (const c of this.forbiddenCycles()) {
      res.insertSorted(
        {
          n: 0,
          m: c.length
        },
        cmp, true
      );
    }

    for (const t of this.alternatingCycles()) {
      res.insertSorted(
        {
          n: t.length,
          m: t.reduce((a, p) => a + p.fbd.length, 0)
        },
        cmp, true
      );
    }

    return res;
  },

  omegaQuiver() {
    if (!this.isStringAlgebra())
      return null;

    return this.smallOmegaQuiver(2);
  },

  smallOmegaQuiver(nMax) {
    const Q = new Quiver(),
      SS = [this.elementaryStrings, this.biserials, this.elementaryCyclicStrings];

    if (nMax === undefined)
      nMax = Math.max(2, nMax, ...this.elementaryStrings.map(s => s.length));

    outer:
    for (const ss of SS) {
      for (const s of ss) {
        if (s.length > nMax)
          continue outer;

        const v = Q.addVertex(s.toString(), s.id);

        v.class = s.class;
        v.string = s;
      }
    }

    outer:
    for (const ss of SS) {
      for (const s of ss) {
        if (s.length > nMax)
          continue outer;

        for (const ind of s.omegaPos())
          Q.addArrow(s.id, ind.id, "");
      }
    }

    return Q;
  },

  bridgeQuiver() {
    if (!this.isDomestic())
      return null;

    const Q = new Quiver(),
      sqv2band = {},
      A = new Set();

    let v_id = 0;

    for (const band_ of this.elementaryBands) {
      for (const band of [band_, band_.rl]) {
        Q._addVertex($.extend(band, { id: v_id++, band }));

        for (const sqa of band.arg) {
          sqv2band[sqa.source.id] = band;
          A.add(sqa);
        }
      }
    }

    for (const a_ of this.elementaryStrings) {
      if (a_.length === 0)
        continue;

      for (const a of [a_, a_.rl]) {
        if (a.arg.some(sqa => A.has(sqa) || A.has(sqa.rl)))
          continue;

        const s = sqv2band[a.source.id], t = sqv2band[a.target.id];

        if (s && t)
          Q.addArrow(s, t, a.toString());
      }
    }

    return Q;
  },

  siltingQuiver() {
    if (!this.isRepFinite())
      return null;

    const res = new Quiver(),
      S0 = new Silter(this, this, null),
      cmp = Silter.compare;

    const unvisited = [], visited = [];

    function visit(S) {
      const S_ = visited.binaryFind(S, cmp);

      if (S_) {
        S = S_;
      }
      else {
        const y = unvisited.binaryFindIndex(S, cmp);

        if (!y.found) {
          unvisited.splice(y.index, 0, S);

          const v = res.addVertex("");

          const cls = [];

          if (S.M.isProjective()) {
            cls.push("projective");
            if (S.M.isZero() || S.P.isZero())
              cls.push("extremal");
          }
          if (S.M.isInjective())
            cls.push("injective");
          if (!S.P.isZero())
            cls.push("non-tilting");

          v.class = cls.join(" ");
          v.silter = S;

          S.v = v;
        }
        else {
          S = unvisited[y.index];
        }
      }

      return S;
    }

    visit(S0);

    while (unvisited.length > 0) {
      const S = unvisited.pop();

      visited.insertSorted(S, cmp);

      for (const M_ of S.M) {
        const T = new Silter(this, S.M, S.P),
          M = T.exchange(M_, null).M;

        if (!M || M.module().homVanishes(M_.tauPos()))
          res.addArrow(S.v, visit(T).v, "");
        else
          visit(T);
      }

      for (const P_ of S.P) {
        const T = new Silter(this, S.M, S.P);

        T.exchange(null, P_);
        visit(T);
      }
    }

    return res;
  },

  threads() {
    if (!this.isGentle())
      return null;

    const res = {},
      Q = this.quiver;

    for (const type of ["awd", "fbd"]) {
      res[type] = [];

      for (const v of Q.vertices) {
        const as_i = Q.as_i[v.id], d_i = as_i.length,
          as_o = Q.as_o[v.id], d_o = as_o.length;

        if (d_i + d_o === 0 || d_i === 2 || d_o === 2)
          continue;
        if (d_i === d_o && as_i[0][`succ_${type}`] !== as_o[0])
          continue;

        res[type].push(Q.path(v));
      }

      for (const a of Q.arrows) {
        if (!a[`pred_${type}`])
          res[type].push(Q.path(maxRightExtension(a, type)));
      }
    }

    return res;
  },

  alternatingCycles() {
    if (!this.isGentle())
      return null;

    const res = [],
      Q = this.quiver,
      T = this.threads();

    const ts_awd = T.awd.slice(), ts_fbd = T.fbd.slice();

    while (ts_awd.length > 0) {
      const tc = [];

      for (let t_dbl = { awd: ts_awd.shift() }; t_dbl.awd;) {
        t_dbl.fbd = extractSuccThread(ts_fbd, t_dbl.awd, Q.as_i, "target", "lst");
        tc.push(t_dbl);
        t_dbl = { awd: extractSuccThread(ts_awd, t_dbl.fbd, Q.as_o, "source", "fst") };
      }

      res.push(tc);
    }

    return res;
  },

  forbiddenCycles() {
    if (!this.isGentle())
      return null;

    const res = [],
      Q = this.quiver;

    this.threads().fbd.forEach(t => t.arrows.forEach(a => a.onFbdCycle = false));

    for (const a of Q.arrows) {
      if (a.onFbdCycle !== undefined)
        continue;

      const cycle = [];

      for (let b = a; ;) {
        cycle.push(b);
        b.onFbdCycle = true;

        if ((b = b.succ_fbd) === a)
          break;
      }

      res.push(Q.path(cycle));
    }

    return res;
  }
});

function initQuiver(quiver) {
  const Q = this.quiver = Quiver.clone(quiver);

  for (const v of Q.vertices) {
    for (const x of [["as_i", "ending"], ["as_o", "starting"]]) {
      if (Q[x[0]][v.id].length > 2)
        error(`Invalid quiver.<br />Too many arrows ${x[1]} in <i>${v.name}</i>.`);
    }
  }
}

function initRelations(relations) {
  const Q = this.quiver,
    Z = this.zeroRelations = [],
    C = this.commutativityRelations = [],
    E = this.extendedZeroRelations = [];

  const commRelCmp = Array.compare(Path.compare);

  for (const str of relations) {
    let r = str
      .replace(/(?:(.)|\(([^)]+)\))\^(\d+)/g,
        (match, p1, p2, p3) => (p1 ? p1 : p2).repeat(p3)
      );

    const m = /^([^-]+)-([^-]+)$/g.exec(r);

    if (m) {
      r = [];

      for (const i of [1, 2])
        r.insertSorted(toZeroRelation.call(this, m[i], str), Path.compare);

      if (r[0].source !== r[1].source || r[0].target !== r[1].target)
        invalidRelationError(str);

      C.insertSorted(r, commRelCmp);
    }
    else {
      Z.insertSorted(toZeroRelation.call(this, r, str), Path.compare);
    }
  }

  // Remove "hidden" zero relations from C
  for (let i = 0; i < Z.length; ++i) {
    outer:
    for (let j = 0; j < C.length; ++j) {
      for (const x of [[0, 1], [1, 0]]) {
        if (C[j][x[0]].contains(Z[i])) {
          Z.insertSorted(C[j][x[1]], Path.compare);
          C.splice(j, 1);

          i = 0;
          break outer;
        }
      }
    }
  }

  // Remove redundant zero relations
  for (let i = 0; i < Z.length; ++i) {
    for (let j = i + 1; j < Z.length; ++j) {
      if (Z[j].contains(Z[i]))
        Z.splice(j, 1);
    }
  }

  for (let i = 0, n = Z.length; i < n && Z[i].length <= 2; ++i) {
    const a = Z[i].arrows[0], b = Z[i].arrows[1];

    a.succ_fbd = b;
    b.pred_fbd = a;
  }

  for (const a of Q.arrows) {
    for (const x of [
      { at: "as_o", t: "succ", ev: "target" },
      { at: "as_i", t: "pred", ev: "source" }
    ]) {
      if (!a[`${x.t}_fbd`] && Q[x.at][a[x.ev].id].length === 2) {
        error(
          [
            "Too few relations.",
            `For example at vertex <i>${a[x.ev].toString()}</i> a relation is missing.`
          ]
            .join("<br />")
        );
      }
    }
  }

  for (const r of C) {
    for (const i of [0, 1])
      E.insertSorted(r[i], Path.compare);
  }
}

function initArrows() {
  const Q = this.quiver;

  for (const v of Q.vertices) {
    for (const x of [["as_o", "toSE"], ["as_i", "frNW"]])
      Q[x[0]][v.id].forEach((a, i) => a[x[1]] = i === 0);
  }
}

function initPaths() {
  const Q = this.quiver,
    Z = this.zeroRelations,
    E = this.extendedZeroRelations,
    P = this.paths = [];

  let N = 0;

  if (Z.length > 0)
    N = Z.last().length;
  if (E.length > 0)
    N = Math.max(N, E.last().length);

  P.push(Q.vertices.map(v => Q.path(v)));

  for (let n = 1; ; ++n) {
    const oldPaths = P.last(), newPaths = [];

    for (const oldPath of oldPaths) {
      const a = oldPath.lst;

      const succs = a && a.succ_awd
        ? [a.succ_awd]
        : Q.as_o[oldPath.target.id];

      for (const b of succs) {
        const newPath = Q.path(oldPath.arrows.concat([b]));
        let rgtPath;

        if (Z.some(r => newPath.contains(r)))
          continue;

        if (n >= 2) {
          rgtPath = Q.path(newPath.arrows.slice(1));

          newPath.red_r = oldPath;
          newPath.red_l = rgtPath;

          oldPath.ext_r_ = newPath;
          rgtPath.ext_l_ = newPath;
        }

        if (E.some(r => newPath.contains(r)))
          continue;

        if (newPath.source === newPath.target && newPath.length >= N) {
          if (
            !Z.some(r => newPath.rotationContains(r)) &&
            !E.some(r => newPath.rotationContains(r))
          ) {
            error(
              [
                "Not finite-dimensional.",
                `High powers of <i>${newPath.toString()}</i> don't vanish.`
              ]
                .join("<br />")
            );
          }
        }

        if (n === 2) {
          a.succ_awd = b;
          b.pred_awd = a;
        }

        if (n >= 2) {
          oldPath.ext_r = newPath;
          rgtPath.ext_l = newPath;
        }

        newPaths.push(newPath);
      }
    }

    if (newPaths.length === 0)
      break;

    P.push(newPaths);
  }
}

function initStringQuiver() {
  const Q = this.stringQuiver = new Quiver(),
    E = this.letterEnds = new LetterEnds(this),
    L = this.letters = new Letters(this);

  for (const v of E.instances())
    Q._addVertex($.extend(v, { class: v.top ? "projective" : "injective" }));

  for (const x of ["dir", "inv"])
    L[x].forEach(l => Q._addArrow(l));

  for (const ss of [Q.vertices, Q.arrows]) {
    for (const s of ss) {
      for (const x of ["ext_l", "ext_r", "ext_l_", "ext_r_"]) {
        let t = s;

        while (t[x])
          t = t[x];

        s[`max_${x}`] = t;
      }
    }
  }

  for (const s of Q.arrows) {
    for (const x of [["l", "r"], ["r", "l"]]) {
      s[`com_ext_${x[0]}`] = s[`max_ext_${x[0]}_`];
      for (let n = s.length; n > 0; --n)
        s[`com_ext_${x[0]}`] = s[`com_ext_${x[0]}`][`red_${x[1]}`];
    }
  }
}

function initStringsAndBands() {
  this.strings = new Strings(this);
  this.bands = new Bands(this);

  initElementaryStringsAndBands.call(this);
  initBiserials.call(this);
  initPIS.call(this);
}

function initElementaryStringsAndBands() {
  const S = this.strings,
    B = this.bands,
    E = [S.ofLength(1, false)];

  const ES = this.elementaryStrings = S.ofLength(0, true).concat(S.ofLength(1, true)),
    ECS = this.elementaryCyclicStrings = [],
    EB = this.elementaryBands = [];

  for (let i = 2; ; ++i) {
    const oldPaths = E.last(), newPaths = [];

    for (const oldPath of oldPaths) {
      for (const a of this.stringQuiver.as_o[oldPath.target.id]) {
        const s = S.get(oldPath.arg.concat([a]), false),
          x = s.isElementary();

        if (x === 1)
          newPaths.push(s);

        if (s.nf) {
          if (x === 1) {
            ES.insertSorted(s, S.compare);
          }
          else if (x === -1) {
            ECS.insertSorted(s, S.compare);
            EB.insertSorted(B.get(s.arg, true), B.compare);
          }
        }
      }
    }

    if (newPaths.length === 0)
      break;

    E.push(newPaths);
  }

  for (const ss of [ES, ECS]) {
    for (const s of ss) {
      if (s.isSemiSimple())
        s.arg.v.S = s;
      if (s.isProjective())
        s.isProjective().P = s;
      if (s.isInjective())
        s.isInjective().I = s;
    }
  }
}

function initBiserials() {
  const BPI = this.BPI = new Biserials(this);

  this.biserials = BPI.instances;

  for (const r of this.commutativityRelations) {
    const L = r.map(x => this.letters.get(x, true, true));

    const s = r[0].source, t = r[0].target,
      PI = BPI.get(L[0].rl, L[1]),
      sqtPI = s.P.normalized,
      radPI = t.I.normalized;

    sqtPI.predsAR().add(PI);
    for (const x of [sqtPI, sqtPI.rl]) {
      x._tauPos = radPI;
      x._isProjective = false;
    }

    radPI.succsAR().add(PI);
    for (const x of [radPI, radPI.rl]) {
      x._tauNeg = sqtPI;
      x._isInjective = false;
    }

    PI._rad = radPI.module();
    PI._sqt = sqtPI.module();
    PI._predsAR = new Module(this).add(radPI);
    PI._succsAR = new Module(this).add(sqtPI);

    s.P = t.I = PI;
  }
}

function initPIS() {
  for (const v of this.quiver.vertices) {
    v.P.class = `${v.P.class ? `${v.P.class} ` : ""}projective`;
    v.I.class = `${v.I.class ? `${v.I.class} ` : ""}injective`;
  }
}

function relationsFromString(str) {
  str = str
    .replace(/(?:\n|\s|,)+/g, " ")
    .replace(/ ?\* ?/g, "")
    .replace(/ ?([-^]) ?/g, "$1")
    .replace(" )", ")")
    .replace("( ", "(")
    .trim();

  return str
    .split(" ")
    .filter(d => d.length > 0);
}

function toZeroRelation(r, str) {
  const res = [];

  if (r.length < 2)
    invalidRelationError(str);

  for (let i = 0, n = r.length; i < n; ++i) {
    const x = this.quiver.arrow(r[i]);

    if (!x || (i > 0 && x.source !== res.last().target))
      invalidRelationError(str);

    res.push(x);
  }

  return this.quiver.path(res);
}

function invalidRelationError(str) {
  error(`Invalid relation <i>${str}</i>.`);
}

function error(str) {
  throw $.extend(new Error(str), { userDefined: true });
}

function maxRightExtension(a, type) {
  const res = [];

  for (let b = a; b; b = b[`succ_${type}`])
    res.push(b);

  return res;
}

function extractSuccThread(ts, t, as, ev, ea) {
  const v = t[ev], a = t[ea];

  if (t.length > 0)
    return ts.findAndRemove(t_ => t_[ev] === v && t_[ea] !== a);
  else if (as[v.id].length === 1)
    return ts.findAndRemove(t_ => t_[ev] === v && t_.length !== 0);
  else
    return ts.findAndRemove(t_ => t_[ev] === v);
}

export default SpecialBiserialAlgebra;
