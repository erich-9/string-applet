const H = require("../util/helper"),
  P = require("./print");

function exportToLatex(infoView) {
  const res = [
    "\\documentclass[a4paper,landscape]{article}",
    "\\usepackage[margin=2cm]{geometry}",
    "\\usepackage[utf8x]{inputenc}",
    "\\usepackage{amsmath}",
    "\\usepackage[hhmmss]{datetime}",
    "\\usepackage{hyperref}",
    "\\usepackage{longtable}",
    "\\usepackage{sectsty}",
    "\\usepackage{tikz}",
    "\\usetikzlibrary{arrows.meta}",
    "\\allsectionsfont{\\centering}",
    `\\title{${infoView.title}}`,
    `\\author{\\url{${document.URL}}}`,
    "\\date{\\today, \\currenttime}",
    "\\begin{document}",
    " \\maketitle",
    exportQuiverToLatex(
      "Quiver",
      infoView.A.quiver,
      { vName: v => v.toString(), aName: a => a.toString() }
    ),
    exportGenericInfoToLatex(
      "Zero Relations",
      "c",
      infoView.A.zeroRelations,
      x => `$${x}$`
    ),
    exportGenericInfoToLatex(
      "Commutativity Relations",
      "rcl",
      infoView.A.commutativityRelations,
      x => `$${x[0]}$ &$=$& $${x[1]}$`
    ),
    exportGenericInfoToLatex(
      "General Information",
      "rc",
      infoView.latexInfo,
      x => {
        const y = H.withDefault(x.longName, "", y_ => `${y_}`),
          z = x.value(infoView);

        return z === null
          ? undefined
          : `${y} & $${H.withDefault(x.transform, P.numberToLatex)(z)}$`;
      }
    ),
    exportIndListToLatex(
      "Biserial Projective-Injectives",
      infoView.A.biserials
    ),
    exportIndListToLatex(
      "Elementary Strings",
      infoView.A.elementaryStrings
    ),
    exportIndListToLatex(
      "Elementary Cyclic Strings",
      infoView.A.elementaryCyclicStrings
    ),
    exportIndListToLatex(
      "Elementary Bands",
      infoView.A.elementaryBands
    ),
    exportModuleQuiverToLatex(
      "Auslander--Reiten Quiver",
      infoView.ARV
    )
  ];

  for (const x of infoView.quiverInfo)
    res.push(exportModuleQuiverToLatex(x.longName, x.view));

  res.push(exportModuleQuiverToLatex(
    "Support-$\\tau$-Tilting Quiver",
    infoView.SQV
  ));

  if (infoView.SQV) {
    res.push(exportGenericInfoToLatex(
      "Support-$\\tau$-Tilting Modules",
      "rc",
      infoView.SQV.quiver.vertices,
      x => {
        const str = x.silter.M.summands
          .map(d => d.ind.toString())
          .join(" \\:\\oplus\\: ");

        return `$${x.id}$ & $${str}$`;
      }
    ));
  }

  res.push("\\end{document}");

  return res.reduce((a, x) => a + (x !== undefined ? `${x}\n` : ""), "");
}

function exportModuleQuiverToLatex(title, quiverView) {
  if (!quiverView)
    return undefined;

  const { width, height } = quiverView.svg.node(0).viewBox.baseVal,
    scale = Math.min(15 / height, 22 / width);

  return exportQuiverToLatex(
    title,
    quiverView.quiver,
    {
      scale,
      vName: v => !v.id.replace ? v.id : v.id.replace(/([+-])([+-])$/, "^$1_$2"),
      layered: quiverView.layered
    }
  );
}

function exportQuiverToLatex(title, quiver, config) {
  const scale = config.scale ? config.scale : 0.04,
    tikzOpts = `x=${scale}cm,y=${-scale}cm`;

  return [
    ` \\section*{${title}}`,
    " \\begin{center}",
    ` \\begin{tikzpicture}[${tikzOpts}]`,
    exportVerticesToLatex(quiver, config),
    exportArrowsToLatex(quiver, config),
    "  \\end{tikzpicture}",
    " \\end{center}"
  ]
    .join("\n");
}

function exportVerticesToLatex(quiver, config) {
  const res = [];

  res.push("   \\begin{scope}[every node/.style={circle,inner sep=1pt}]");

  for (const v of quiver.vertices) {
    const n = config.vName ? `$${config.vName(v)}$` : "";

    res.push(`    \\node (${v.id}) at (${tf(v.x)},${tf(v.y)}) {${n}};`);
  }

  res.push("   \\end{scope}");

  return res.join("\n");
}

function exportArrowsToLatex(quiver, config) {
  const res = [],
    scopeOpts = ["every node/.style={fill=white}"];

  if (!config.layered)
    scopeOpts.push("every path/.style={-{Latex[length=2mm,width=1mm]}}");

  res.push(`   \\begin{scope}[${scopeOpts.join(",")}]`);

  for (const a of quiver.arrows) {
    const m = a.m_id,
      s = a.source.id,
      t = a.target.id,
      n = config.aName ? ` node {$${config.aName(a)}$}` : "",
      o = [];

    if (a.trans)
      o.push("dotted");
    if (s === t)
      o.push(`looseness=10,${m === 0 ? "out=130,in=50" : "in=-130,out=-50"}`);
    else if (!config.layered)
      o.push(`bend left=${(2 * m + 1) * 13}`);

    res.push(`    \\path (${s}) edge[${o.join(",")}]${n} (${t});`);
  }

  res.push("   \\end{scope}");

  return res.join("\n");
}

function exportGenericInfoToLatex(title, align, info, f) {
  if (info.length === 0)
    return undefined;

  const tmp = [], res = [
    ` \\section*{${title}}`,
    ` \\begin{longtable}{${align}}`
  ];

  if (info.length > 0) {
    for (const x of info) {
      const y = f(x);

      if (y !== undefined)
        tmp.push(y);
    }

    res.push(`  ${tmp.join(" \\\\\n  ")}`);
  }

  res.push(" \\end{longtable}");

  return res.join("\n");
}

function exportIndListToLatex(title, indList) {
  if (indList.length === 0)
    return undefined;

  return exportGenericInfoToLatex(
    title,
    "rc",
    indList,
    x => `${x.id} & ${x.toString()}`
  );
}

function tf(x) {
  return x.toFixed(3);
}

module.exports = {
  exportToLatex
};
