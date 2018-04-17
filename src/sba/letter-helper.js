require("../util/array-extensions");

function concat() {
  const res = [];
  let res_ = null;

  for (let i = 0, n = arguments.length; i < n; ++i) {
    const x = arguments[i];

    if (x.path)
      res.push(x);
    else
      res_ = x;
  }

  return res.length > 0 ? res : res_;
}

function flatten(letters) {
  for (let i = 1; i < letters.length;) {
    if (letters[i - 1].dir === letters[i].dir)
      letters.splice(i - 1, 2, letters[i - 1].join(letters[i]));
    else
      ++i;
  }

  return letters;
}

function invert(letters) {
  const res = [];

  for (let i = letters.length - 1; i >= 0; --i)
    res.push(letters[i].rl);

  return res;
}

function leftExtensionSame(arg, inPlace = false) {
  return _extensionSame(arg, inPlace, "ext_l", "first", "lmod");
}

function rightExtensionSame(arg, inPlace = false) {
  return _extensionSame(arg, inPlace, "ext_r", "last", "rmod");
}

function leftMaxExtensionSame(arg, inPlace = false) {
  return _extensionSame(arg, inPlace, "max_ext_l", "first", "lmod");
}

function rightMaxExtensionSame(arg, inPlace = false) {
  return _extensionSame(arg, inPlace, "max_ext_r", "last", "rmod");
}

function leftExtensionDiff(arg, inPlace = false) {
  return _extensionDiff(arg, inPlace, "ext_l", "source", "first", "lmod");
}

function rightExtensionDiff(arg, inPlace = false) {
  return _extensionDiff(arg, inPlace, "ext_r", "target", "last", "rmod");
}

function leftMaxExtensionDiff(arg, inPlace = false) {
  return _extensionDiff(arg, inPlace, "max_ext_l", "source", "first", "lmod");
}

function rightMaxExtensionDiff(arg, inPlace = false) {
  return _extensionDiff(arg, inPlace, "max_ext_r", "target", "last", "rmod");
}

function _extensionSame(arg, inPlace, t, ea, mod) {
  if (!Array.isArray(arg))
    return toArg(arg[t]);

  if (!inPlace)
    arg = arg.slice();

  const xst = arg[ea](), ext = xst[t];

  if (ext)
    return ext !== xst ? arg[mod](0, 1, ext) : arg;

  return null;
}

function _extensionDiff(arg, inPlace, t, ev, ea, mod) {
  if (!Array.isArray(arg))
    return toArg(arg[t]);

  if (!inPlace)
    arg = arg.slice();

  const xst = arg[ea](), ext = xst[ev][t];

  if (ext)
    return ext.path ? arg[mod](0, 0, ext) : arg;

  return null;
}

function toArg(x) {
  return x && x.path ? [x] : x;
}

function leftReduction(arg, inPlace = false) {
  return _reduction(arg, inPlace, "red_l", "first", "lmod");
}

function rightReduction(arg, inPlace = false) {
  return _reduction(arg, inPlace, "red_r", "last", "rmod");
}

function leftMaxReduction(arg, inPlace = false) {
  return _maxReduction(arg, inPlace, "target", "lmod");
}

function rightMaxReduction(arg, inPlace = false) {
  return _maxReduction(arg, inPlace, "source", "rmod");
}

function _reduction(arg, inPlace, t, ea, mod) {
  if (!Array.isArray(arg))
    return null;

  if (!inPlace)
    arg = arg.slice();

  const xst = arg[ea]();

  if (xst.length === 1)
    return arg.length === 1 ? xst[t] : arg[mod](0, 1);

  return arg[mod](0, 1, xst[t]);
}

function _maxReduction(arg, inPlace, ev, mod) {
  if (!Array.isArray(arg))
    return null;

  if (arg.length === 1)
    return arg[0][ev];

  if (!inPlace)
    arg = arg.slice();

  return arg[mod](0, 1);
}

function subLetters(arg, i, j) {
  if (!Array.isArray(arg))
    return arg;

  i = i < 0 ? arg.length + i : i;
  j = j < 0 ? arg.length + j : j;

  if (i === j)
    return i < arg.length ? arg[i].source : arg.last().target;

  return arg.slice(i, j);
}

module.exports = {
  concat,
  flatten,
  invert,
  leftExtensionDiff,
  leftExtensionSame,
  leftMaxExtensionDiff,
  leftMaxExtensionSame,
  leftMaxReduction,
  leftReduction,
  rightExtensionDiff,
  rightExtensionSame,
  rightMaxExtensionDiff,
  rightMaxExtensionSame,
  rightMaxReduction,
  rightReduction,
  subLetters
};
