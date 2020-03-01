import $ from "jquery";
import H from "../util/helper";

function LetterEnds(A) {
  const allInstances = [],
    topDir = [], topInv = [], socDir = [], socInv = [],
    iCmp = (l1, l2) => H.compare(l1.v.id, l2.v.id);

  function init() {
    for (const v of A.quiver.vertices)
      LetterEnd.get(v, true, true);
  }

  function exportMethods() {
    LetterEnd.instances = instances;
  }

  function instances(top, dir) {
    if (top === undefined && dir === undefined)
      return allInstances;

    return dir ? (top ? topDir : socDir) : (top ? topInv : socInv);
  }

  const LetterEnd = class {
    static get(v, top = true, dir = true) {
      if (!v)
        return null;

      const I = instances(top, dir),
        y = I.binaryFindIndex({ v, top, dir }, iCmp);

      return y.found
        ? I[y.index]
        : new LetterEnd({ I, pos: y.index }, v, top, dir);
    }

    static compare(l1, l2) {
      let cmp = H.compare(!l1.top, !l2.top);

      if (cmp !== 0)
        return cmp;

      cmp = H.compare(l1.v.id, l2.v.id);

      if (cmp !== 0)
        return cmp;

      return H.compare(!l1.dir, !l2.dir);
    }

    toString() {
      return this.name;
    }

    // private constructor -> use get
    constructor(context, v, top, dir) {
      $.extend(this, { v, top, dir });

      context.I.splice(context.pos, 0, this);
      allInstances.insertSorted(this, LetterEnd.compare);

      $.extend(this, {
        rl: LetterEnd.get(v, top, !dir),
        td: LetterEnd.get(v, !top, dir),

        name: v.name,
        id: `${v.name}${top ? "+" : "-"}${dir ? "+" : "-"}`
      });
    }

    finalize() {
      const [x, y] = this.top ? [this.td, this] : [this, this.td];

      $.extend(this, {
        sop: !x.ext_l,
        sid: !y.ext_l,

        eop: !x.ext_r,
        eid: !y.ext_r
      });

      this.normalized = this.dir ? y : y.rl;
    }
  };

  init();
  exportMethods();

  return LetterEnd;
}

export default LetterEnds;
