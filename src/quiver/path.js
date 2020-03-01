import H from "../util/helper";

const arrowsCompare = Array.compare((a1, a2) => H.compare(a1.id, a2.id));

class Path {
  static compare(p1, p2) {
    const cmp = H.compare(p1.length, p2.length);

    if (cmp !== 0)
      return cmp;
    if (p1.length === 0 && p2.length === 0)
      return H.compare(p1.source.id, p2.source.id);

    return arrowsCompare(p1.arrows, p2.arrows);
  }

  constructor(arg) {
    if (!Array.isArray(arg)) {
      this.arrows = [];

      this.length = 0;

      this.fst = null;
      this.lst = null;

      this.source = arg;
      this.target = arg;

      this.nameLR = `→${this.source.id}→`;
      this.nameRL = `←${this.source.id}←`;
    }
    else {
      this.arrows = arg;

      this.length = arg.length;

      this.fst = arg.first();
      this.lst = arg.last();

      this.source = this.fst.source;
      this.target = this.lst.target;

      this.nameLR = `→${this.arrows.reduce((str, a) => str + a.name, "")}→`;
      this.nameRL = `←${this.arrows.reduce((str, a) => a.name + str, "")}←`;
    }
  }

  contains(other) {
    const n = this.length, m = other.length;

    if (m === 0) {
      for (const a of this.arrows) {
        if (a.source === other.source)
          return true;
      }

      return other.target === this.target;
    }
    else if (m <= n) {
      for (let i = 0, l = n - m; i <= l; ++i) {
        let j = 0;

        for (; j < m; ++j) {
          if (this.arrows[i + j] !== other.arrows[j])
            j = m;
        }

        if (j === m)
          return true;
      }
    }

    return false;
  }

  rotationContains(other) {
    const n = this.length, m = other.length;

    if (m === 0) {
      this.contains(other);
    }
    else if (m <= n) {
      for (let i = 0; i < n; ++i) {
        let j = 0;

        for (; j < m; ++j) {
          if (this.arrows[(i + j) % n] !== other.arrows[j])
            j = m;
        }

        if (j === m)
          return true;
      }
    }

    return false;
  }

  toString(LR = true) {
    return LR ? this.nameLR : this.nameRL;
  }
}

export default Path;
