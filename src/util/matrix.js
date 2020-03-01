import H from "./helper";

class Rational {
  static equal(x, y) {
    return x.p * y.q === y.p * x.q;
  }

  static sum(x, y) {
    return new Rational(x.p * y.q + y.p * x.q, x.q * y.q, true);
  }

  static difference(x, y) {
    return new Rational(x.p * y.q - y.p * x.q, x.q * y.q, true);
  }

  static product(x, y) {
    return new Rational(x.p * y.p, x.q * y.q, true);
  }

  static quotient(x, y) {
    return new Rational(x.p * y.q, x.q * y.p, true);
  }

  constructor(p = 0, q = 1, normalize = false) {
    this.p = p;
    this.q = q;

    if (normalize)
      this.normalize();
  }

  isZero() {
    return this.p === 0;
  }

  normalize() {
    const d = gcd(this.p, this.q);

    this.p /= d;
    this.q /= d;

    if (this.q < 0) {
      this.p *= -1;
      this.q *= -1;
    }
  }

  add(other) {
    [this.p, this.q] = [this.p * other.q + other.p * this.q, this.q * other.q];
    this.normalize();

    return this;
  }

  subtract(other) {
    [this.p, this.q] = [this.p * other.q - other.p * this.q, this.q * other.q];
    this.normalize();

    return this;
  }

  multiplyWith(other) {
    this.p *= other.p;
    this.q *= other.q;
    this.normalize();

    return this;
  }

  divideBy(other) {
    this.p *= other.q;
    this.q *= other.p;
    this.normalize();

    return this;
  }

  toString() {
    return this.q === 0 || this.q === 1 ? String(this.p) : `${this.p}/${this.q}`;
  }
}

class Matrix {
  static zero(rows, cols) {
    return Matrix.init(rows, cols, () => 0);
  }

  static identity(n) {
    return Matrix.init(n, n, (i, j) => i === j ? 1 : 0);
  }

  static init(rows, cols, initFunc) {
    const M = new Array(rows);

    if (cols === undefined)
      cols = rows;

    for (let i = 0; i < rows; ++i) {
      const row = M[i] = new Array(cols);

      for (let j = 0; j < cols; ++j) {
        const x = initFunc(i, j);

        row[j] = x instanceof Rational ? x : new Rational(x);
      }
    }

    return new Matrix(M);
  }

  static equal(M, N) {
    if (M.rows !== N.rows || M.cols !== N.cols)
      return false;

    for (let i = 0; i < M.rows; ++i) {
      for (let j = 0; j < M.cols; ++j) {
        if (!Rational.equal(M.M[i][j], N.M[i][j]))
          return false;
      }
    }

    return true;
  }

  static product(M, N) {
    if (M.cols !== N.rows)
      return null;

    const L = [];

    for (let i = 0; i < M.rows; ++i) {
      const row = L[i] = new Array(N.cols);

      for (let j = 0; j < N.cols; ++j) {
        row[j] = new Rational();
        for (let k = 0; k < M.cols; ++k)
          row[j].add(Rational.product(M.M[i][k], N.M[k][j]));
      }
    }

    return new Matrix(L);
  }

  constructor(M = []) {
    this.M = M.map(row => row.map(x => x instanceof Rational ? x : new Rational(x)));

    this.rows = M.length;
    this.cols = this.rows ? M[0].length : 0;
  }

  toString() {
    return this.M.map(row => `[${row.join(" ")}]`).join("\n");
  }
}

H.addCachedMethods(Matrix, {
  determinant() {
    if (this.rows !== this.cols)
      return null;

    const { D, sgn } = this.gauss(), res = new Rational(sgn);

    for (let i = 0; i < this.rows; ++i)
      res.multiplyWith(D.M[i][i]);

    return res;
  },

  rank() {
    const n = Math.min(this.rows, this.cols);

    const D = this.gauss().D;
    let res = 0;

    for (let i = 0; i < n; ++i) {
      if (!D.M[i][i].isZero())
        ++res;
    }

    return res;
  },

  gauss() {
    const rows = this.rows, cols = this.cols,
      n = Math.min(rows, cols),
      D = new Matrix(this.M.map(row => row.map(x => new Rational(x.p, x.q)))),
      // P = Matrix.identity(rows),
      // Q = Matrix.identity(cols),
      L = Matrix.zero(rows),
      R = Matrix.zero(cols);
    let sgn = 1;

    for (let k = 0, piv; k < n; ++k) {
      if ((piv = findRowPivot(D, k)) !== -1) {
        if (piv !== k) {
          swapRows(D, k, piv);
          swapRows(L, k, piv);
          // swapRows(P, k, piv);
          sgn *= -1;
        }
      }
      else if ((piv = findColPivot(D, k)) !== -1) {
        swapCols(D, k, piv);
        swapCols(R, k, piv);
        // swapCols(Q, k, piv);
        sgn *= -1;
      }
      else {
        continue;
      }

      // Row operations
      for (let i = k; i < rows; ++i)
        L.M[i][k] = Rational.quotient(D.M[i][k], D.M[k][k]);
      for (let i = k + 1; i < rows; ++i) {
        for (let j = k; j < cols; ++j)
          D.M[i][j].subtract(Rational.product(L.M[i][k], D.M[k][j]));
      }

      // Column operations
      for (let j = k; j < cols; ++j)
        R.M[k][j] = Rational.quotient(D.M[k][j], D.M[k][k]);
      for (let j = k + 1; j < cols; ++j) {
        for (let i = k; i < rows; ++i)
          D.M[i][j].subtract(Rational.product(R.M[k][j], D.M[i][k]));
      }
    }

    return { D, L, R, /* P, Q */ sgn };
  }
});

function findRowPivot(M, k) {
  for (let i = k; i < M.rows; ++i) {
    if (!M.M[i][k].isZero())
      return i;
  }

  return -1;
}

function findColPivot(M, k) {
  for (let j = k + 1; j < M.cols; ++j) {
    if (!M.M[k][j].isZero())
      return j;
  }

  return -1;
}

function swapRows(M, k, l) {
  for (let j = 0; j < M.cols; ++j)
    [M.M[k][j], M.M[l][j]] = [M.M[l][j], M.M[k][j]];
}

function swapCols(M, k, l) {
  for (let i = 0; i < M.rows; ++i)
    [M.M[i][k], M.M[i][l]] = [M.M[i][l], M.M[i][k]];
}

function gcd(m, n) {
  for (;;) {
    if (m === 0)
      return n;
    n %= m;
    if (n === 0)
      return m;
    m %= n;
  }
}

export default Matrix;
