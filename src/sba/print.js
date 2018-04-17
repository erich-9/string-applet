const QuiverView = require("../quiver/quiver-view");

function agInvariantToLatex(x) {
  return `[${x.map(inv => `(${inv.n},${inv.m})`).join(",")}]`;
}

function alternatingCycleToHtml(c) {
  const x = c.map(p => `${p.awd.toString(true)}${p.fbd.toString(false)}`).join("");

  return `<div class="thready">${x}</div>`;
}

function arrayToHtml(array, func) {
  if (array.length === 0)
    return "<i>none</i>";

  return array.map(x => func(x)).join("\n");
}

function bandToHtml(x) {
  return `<div class="stringy band">${x.toString()}</div>`;
}

function biserialToHtml(x, count = 1) {
  let res = x.toString();

  res = wrapWithCount(res, count);
  res = `<div class="stringy biserial id-${x.id} projective injective">${res}</div>`;

  return res;
}

function forbiddenCycleToHtml(p) {
  const x = `${p.toString()} : {${p.arrows.map(a => a.source.name).join(",")}}`;

  return `<div class="thready">${x}</div>`;
}

function matrixToLatex(M) {
  return `\\begin{pmatrix}${M.map(x => x.join("&")).join("\\\\")}\\end{pmatrix}`;
}

function moduleToHtml(ms) {
  if (ms.size === 0)
    return "<i>empty</i>";

  return ms.reduce((a, x, c) => a + stringOrBiserialToHtml(x, c), "");
}

function nakayamaPermutationToLatex(x) {
  return `[${x.map(nu => `${nu.P.toString()} \\mapsto ${nu.I.toString()}`)}]`;
}

function numberToLatex(x) {
  return x === Infinity ? "\\infty" : (x === -Infinity ? "-\\infty" : x);
}

function putQuiverIntoContainer(Q, container, config = {}) {
  container.empty();

  if (!Q.isEmpty())
    return (new QuiverView(Q, container[0], config)).layout();

  container.append("<i>empty</i>");

  return undefined;
}

function stringOrBiserialToHtml(x, count = 1) {
  return (x.isBiserial ? biserialToHtml : stringToHtml)(x, count);
}

function stringToHtml(x, count = 1) {
  const cls = [`stringy string id-${x.id}`];

  if (x.isProjective())
    cls.push("projective");
  if (x.isInjective())
    cls.push("injective");

  let res = x.toString();

  res = howToStartToHtml(x) + res + howToEndToHtml(x);
  res = wrapWithCount(res, count);
  res = `<div class="${cls.join(" ")}">${res}</div>`;

  return res;
}

function howToStartToHtml(l) {
  let ht;

  if (!l.sop && !l.sid)
    ht = "&#8644;";
  else if (!l.sop)
    ht = "&rarr;";
  else if (!l.sid)
    ht = "&larr;";
  else
    ht = "<span class=\"arr-space\"></span>";

  return `<span class="how-to-go-on">${ht}</span>`;
}

function howToEndToHtml(l) {
  let ht;

  if (!l.eop && !l.eid)
    ht = "&#8646;";
  else if (!l.eop)
    ht = "&larr;";
  else if (!l.eid)
    ht = "&rarr;";
  else
    ht = "<span class=\"arr-space\"></span>";

  return `<span class="how-to-go-on">${ht}</span>`;
}

function wrapWithCount(x, count) {
  return count > 1 ? `${count} &times; (${x})` : x;
}

module.exports = {
  agInvariantToLatex,
  alternatingCycleToHtml,
  arrayToHtml,
  bandToHtml,
  biserialToHtml,
  forbiddenCycleToHtml,
  matrixToLatex,
  moduleToHtml,
  nakayamaPermutationToLatex,
  numberToLatex,
  putQuiverIntoContainer,
  stringOrBiserialToHtml,
  stringToHtml
};
