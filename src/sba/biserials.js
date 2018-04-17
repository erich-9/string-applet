const $ = require("jquery"),
  H = require("../util/helper"),
  Module = require("./module");

function Biserials(A) {
  const instances = [],
    lettersCompare = Array.compare(A.letters.compare);

  let id = -1;

  function init() {
    Biserial.prototype.A = A;
    Biserial.prototype.get = Biserial.get;

    Biserial.instances = instances;
  }

  class Biserial {
    static get(lInv, lDir) {
      const I = instances,
        y = I.binaryFindIndex({ lInv, lDir }, Biserial.compare);

      return y.found
        ? I[y.index]
        : new Biserial(
          { I, pos: y.index },
          lInv,
          lDir
        );
    }

    static getById(id) {
      return instances.find(i => i.id === id);
    }

    static compare(s1, s2) {
      return lettersCompare([s1.lInv, s1.lDir], [s2.lInv, s2.lDir]);
    }

    isSemiSimple() {
      return false;
    }

    isProjective() {
      return this.lInv.target.v;
    }

    isInjective() {
      return this.lInv.source.v;
    }

    projectiveCover() {
      return this.module();
    }

    injectiveHull() {
      return this.module();
    }

    rad() {
      return this._rad;
    }

    sqt() {
      return this._sqt;
    }

    tauPos() {
      return null;
    }

    tauNeg() {
      return null;
    }

    predsAR() {
      return this._predsAR;
    }

    succsAR() {
      return this._succsAR;
    }

    isTauPosRigid() {
      return true;
    }

    endDim() {
      return 1;
    }

    // private constructor -> use get
    constructor(context, lInv, lDir) {
      $.extend(this, { id, lInv, lDir, isBiserial: true });

      context.I.splice(context.pos, 0, this);
      --id;

      this.normalized = this;
    }
  }

  H.addCachedMethods(Biserial, {
    letterLength() {
      return this.lInv.length + this.lDir.length;
    },

    supp() {
      const res = new Module(this.A);

      for (const l of [this.lInv, this.lDir]) {
        for (let j = 0, m = l.length; j < m; ++j)
          res.add(this.A.strings.get(l.vertex(j)));
      }

      return res;
    },

    top() {
      return Module.from(this.lInv.target.v.S, A);
    },

    soc() {
      return Module.from(this.lInv.source.v.S, A);
    },

    omegaPos() {
      return new Module(A);
    },

    omegaNeg() {
      return new Module(A);
    },

    topSubs() {
      return this.sqt().topSubs().clone().concat(this.module());
    },

    socSubs() {
      return this.rad().socSubs().clone().concat(this.module());
    },

    module() {
      return Module.from(this, A);
    },

    toString() {
      return this.lInv.toString() + this.lDir.toString();
    }
  });

  init();

  return Biserial;
}

module.exports = Biserials;
