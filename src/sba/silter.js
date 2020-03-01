import H from "../util/helper";
import Module from "./module";

class Silter {
  static compare(S, T) {
    const cmpM = Module.compare(S.M, T.M);

    if (cmpM !== 0)
      return cmpM;

    return Module.compare(S.P, T.P);
  }

  constructor(A, M, P) {
    this.A = A;
    this.M = Module.from(M, A, true);
    this.P = Module.from(P, A, true);
  }

  equals(other) {
    return this.M.equals(other.M) && this.P.equals(other.P);
  }

  exchange(N, Q) {
    if (N && Q)
      return null;

    let N_ = null, Q_ = null;

    if (N) {
      const suppN = N.supp();
      const suppM_diff = this.M.supp().find(
        (ind, mult) => mult === suppN.multiplicity(ind)
      );

      this.M.remove(N);
      if (!suppM_diff)
        N_ = exchangePartner(this.M, this.P, N);
      else
        Q_ = suppM_diff.ind.arg.v.P;
    }
    else if (Q) {
      this.P.remove(Q);
      N_ = exchangePartner(this.M, this.P);
    }

    if (N_)
      this.M.add(N_);
    if (Q_)
      this.P.add(Q_);

    return { M: N_, P: Q_ };
  }

  gMatrix() {
    const Q = this.A.quiver,
      id2ix = {},
      res = H.zeroMatrix(Q.vertices.length);

    Q.vertices.forEach((v, i) => id2ix[v.id] = i);

    this.M.forEach((ind, n, j) => {
      ind.top().forEach(
        (smd, m) => res[id2ix[smd.arg.v.id]][j] += m
      );
      ind.omegaPos().top().forEach(
        (smd, m) => res[id2ix[smd.arg.v.id]][j] -= m
      );
    });

    const r = this.M.size;

    this.P.forEach((ind, n, j) => {
      ind.top().forEach(
        (smd, m) => res[id2ix[smd.arg.v.id]][r + j] -= m
      );
    });

    return res;
  }

  toString() {
    return `(\n  M : ${this.M.toString()}\n  P : ${this.P.toString()}\n)`;
  }
}

function exchangePartner(M, P, N) {
  for (const x of [M.A.biserials, M.A.strings]) {
    for (const s of x) {
      if (s === N || M.has(s))
        continue;

      const N_ = s.module();

      if (!N_.isTauPosRigid() || !P.homVanishes(N_))
        continue;

      if (!N_.homVanishes(M.tauPos()) || !M.homVanishes(N_.tauPos()))
        continue;

      return s;
    }
  }

  return null;
}

export default Silter;
