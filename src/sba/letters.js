const $ = require("jquery"),
  H = require("../util/helper"),
  Path = require("../quiver/path");

function Letters(A) {
  const tdDir = [], tdDirExc = [], tdInv = [], tdInvExc = [];

  let id = 0;

  function init() {
    for (let i = 1, n = A.paths.length; i < n; ++i) {
      for (const path of A.paths[i])
        Letter.get(path);
    }

    for (const path of A.extendedZeroRelations)
      Letter.get(path, true, true);

    for (const dir of [true, false]) {
      instances(dir).forEach(l => l.finalize());
      for (const top of [true, false])
        A.letterEnds.instances(top, dir).forEach(v => v.finalize());
    }
  }

  function exportMethods() {
    Letter.dir = tdDir;
    Letter.inv = tdInv;
  }

  function instances(dir, exceptional = false) {
    return exceptional ? (dir ? tdDirExc : tdInvExc) : (dir ? tdDir : tdInv);
  }

  const iCmp = (l1, l2) => Path.compare(l1.path, l2.path);

  const Letter = class {
    static get(path, dir = true, exceptional = false) {
      if (!path)
        return null;

      const I = instances(dir, exceptional),
        y = I.binaryFindIndex({ path, dir }, iCmp);

      return y.found
        ? I[y.index]
        : new Letter({ I, pos: y.index }, path, dir, exceptional);
    }

    static compare(l1, l2) {
      const cmp = H.compare(!l1.dir, !l2.dir);

      if (cmp !== 0)
        return cmp;

      return Path.compare(l1.path, l2.path);
    }

    vertex(i) {
      const arrows = this.path.arrows;

      if (this.dir)
        return i < this.length ? arrows[i].source : this.target.v;
      else
        return i > 0 ? arrows[this.length - i].source : this.source.v;
    }

    join(other) {
      const [x, y] = this.dir ? [this, other] : [other, this];

      return Letter.get(A.quiver.path(x.path.arrows.slice().concat(y.path.arrows)), this.dir);
    }

    toString() {
      return this.name;
    }

    // private constructor -> use get
    constructor(context, path, dir, exceptional = false) {
      $.extend(this, { id, path, dir, length: path.length, exceptional });

      context.I.splice(context.pos, 0, this);
      ++id;

      const [x, y, m, n, p, q] = dir
        ? [path.source, path.target, path.fst.toSE, path.lst.frNW, path.red_l, path.red_r]
        : [path.target, path.source, path.lst.frNW, path.fst.toSE, path.red_r, path.red_l];

      $.extend(this, {
        source: A.letterEnds.get(x, dir, m === dir),
        target: A.letterEnds.get(y, !dir, n === dir),

        rl: Letter.get(path, !dir, exceptional),

        red_l: Letter.get(p, dir),
        red_r: Letter.get(q, dir),

        name: path.toString(dir)
      });

      if (!this.red_l)
        this.red_l = this.target;
      if (!this.red_r)
        this.red_r = this.source;

      if (!exceptional) {
        this.red_l.ext_l = this;
        this.red_r.ext_r = this;
      }

      this.red_l.ext_l_ = this;
      this.red_r.ext_r_ = this;
    }

    finalize() {
      const [x, y, p, q] = this.dir
        ? [this, this.source, this.target, this]
        : [this.source, this, this, this.target];

      $.extend(this, {
        sop: !x.ext_l,
        sid: !y.ext_l,

        eop: !p.ext_r,
        eid: !q.ext_r
      });
    }
  };

  init();
  exportMethods();

  return Letter;
}

module.exports = Letters;
