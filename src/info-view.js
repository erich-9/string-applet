require("jquery-ui/button");
require("jquery-ui/dialog");
require("jquery-ui/tabs");

const $ = require("jquery"),
  FileSaver = require("file-saver"),
  H = require("./util/helper"),
  L = require("./sba/latex-export"),
  P = require("./sba/print"),
  MathJax = require("mathjax"),
  Silter = require("./sba/silter");

const addMoreStringsButton = $("#add-more-strings").button(),
  body = $("body"),
  overlay = $("#overlay").hide(),
  tabs = $("#tabs").tabs(),
  showSiltingQuiverButton = $("#show-silting-quiver").button(),
  showSiltingQuiverDialog = $("#show-silting-quiver-dialog").dialog({
    autoOpen: false,
    height: "auto",
    modal: true,
    position: { my: "center", at: "center", of: tabs },
    resizable: false,
    width: 400
  }),
  stringInfoDialog = $("#string-info-dialog").dialog({
    autoOpen: false,
    modal: true,
    position: { my: "center", at: "center", of: tabs },
    resizable: true,
    width: () => tabs.outerWidth() / 1.3
  }),
  title = $("#title");

const tabsInnerWidth = () => tabs.innerWidth() - 111;

const visibilityConditions = [
  {
    name: "string-algebra",
    condition: infoView => infoView.A.isStringAlgebra()
  },
  {
    name: "gentle",
    condition: infoView => infoView.A.isGentle()
  },
  {
    name: "rep-finite",
    condition: infoView => infoView.A.isRepFinite()
  },
  {
    name: "domestic",
    condition: infoView => infoView.A.isDomestic()
  },
  {
    name: "self-injective",
    condition: infoView => infoView.A.isSelfInjective()
  }
];

const latexInfo = [
  {
    element: $("#cartan-matrix"),
    name: "C_\\Lambda",
    longName: "Cartan matrix",
    value: infoView => infoView.A.cartanMatrixArray(),
    transform: P.matrixToLatex
  },
  {
    element: $("#cartan-matrix-determinant"),
    name: "\\det(C_\\Lambda)",
    longName: "determinant of the Cartan matrix",
    value: infoView => infoView.A.cartanMatrix().determinant().p
  },
  {
    element: $("#cartan-matrix-rank"),
    name: "\\operatorname{rank}(C_\\Lambda)",
    longName: "rank of the Cartan matrix",
    value: infoView => {
      const A = infoView.A.cartanMatrix(), det = A.determinant();

      return !det.isZero() ? null : A.rank();
    }
  },
  {
    element: $("#dimension"),
    name: "\\dim(\\Lambda)",
    longName: "vector-space dimension",
    value: infoView => infoView.A.dim()
  },
  {
    element: $("#left-injective-dimension"),
    name: "\\operatorname{injdim}({}_\\Lambda\\Lambda)",
    longName: "left injective dimension",
    value: infoView => infoView.A.lInjDim()
  },
  {
    element: $("#right-injective-dimension"),
    name: "\\operatorname{injdim}(\\Lambda_\\Lambda)",
    longName: "right injective dimension",
    value: infoView => infoView.A.rInjDim()
  },
  {
    element: $("#dominant-dimension"),
    name: "\\operatorname{domdim}(\\Lambda)",
    longName: "dominant dimension",
    value: infoView => infoView.A.domDim()
  },
  {
    element: $("#krull-gabriel-dimension"),
    name: "\\operatorname{kgdim}(\\Lambda)",
    longName: "Krull--Gabriel dimension",
    value: infoView => infoView.A.kgDim()
  },
  {
    element: $("#representation-dimension"),
    name: "\\operatorname{repdim}(\\Lambda)",
    longName: "representation dimension",
    value: infoView => infoView.A.repDim()
  },
  {
    element: $("#global-dimension"),
    name: "\\operatorname{gldim}(\\Lambda)",
    longName: "global dimension",
    value: infoView => infoView.A.glDim()
  },
  {
    element: $("#finitistic-dimension"),
    name: "\\operatorname{findim}(\\Lambda)",
    longName: "finitistic dimension",
    value: infoView => infoView.A.glDim() === Infinity ? infoView.A.finDim() : null
  },
  {
    element: $("#no-indecomposables"),
    name: "\\#\\operatorname{ind}(\\Lambda)",
    longName: "$\\#$ indecomposables up to $\\cong$",
    value: infoView => infoView.A.numberOfIndecomposables()
  },
  {
    element: $("#ag-invariant"),
    name: "\\phi_\\Lambda",
    longName: "Avella-Alaminos--Geiß invariant",
    value: infoView => infoView.A.agInvariant(),
    transform: P.agInvariantToLatex
  },
  {
    element: $("#nakayama-permutation"),
    name: "\\nu_\\Lambda",
    longName: "Nakayama permutation",
    value: infoView => infoView.A.nakayamaPermutation(),
    transform: P.nakayamaPermutationToLatex
  }
];

const stringyInfo = [
  {
    element: $("#strings"),
    value: infoView => infoView.A.elementaryStrings
  },
  {
    element: $("#cyclic-strings"),
    value: infoView => infoView.A.elementaryCyclicStrings
  },
  {
    element: $("#biserials"),
    value: infoView => infoView.A.biserials,
    transform: P.biserialToHtml
  },
  {
    element: $("#bands"),
    value: infoView => infoView.A.elementaryBands,
    transform: P.bandToHtml
  },
  {
    element: $("#forbidden-cycles"),
    value: infoView => infoView.A.forbiddenCycles(),
    transform: P.forbiddenCycleToHtml
  },
  {
    element: $("#alternating-cycles"),
    value: infoView => infoView.A.alternatingCycles(),
    transform: P.alternatingCycleToHtml
  }
];

const siltingLatexInfo = [
  {
    element: $("#silting-g-matrix"),
    value: infoView => infoView.S.gMatrix(),
    transform: P.matrixToLatex
  }
];

const quiverDefaultConfig = {
  minViewBoxWidth: tabsInnerWidth,
  showArrowNames: false,
  showVertexNames: false
};

const quiverInfo = [
  {
    element: $("#string-quiver"),
    longName: "String Quiver",
    quiver: infoView => infoView.A.stringQuiver,
    config: {
      showArrowNames: true,
      showArrowToolTips: true,
      showVertexNames: true
    }
  },
  {
    element: $("#omega-quiver"),
    longName: "Reduced Syzygy Quiver",
    quiver: infoView =>
      infoView.A[infoView.A.isRepFinite() ? "smallOmegaQuiver" : "omegaQuiver"](),
    config(infoView) {
      return {
        handler: {
          vertexClicked(v) {
            infoView.showStringInfo(v.string);
          }
        },
        showVertexToolTips: true
      };
    }
  },
  {
    element: $("#bridge-quiver"),
    longName: "Bridge Quiver",
    quiver: infoView => infoView.A.bridgeQuiver(),
    config: {
      showArrowNames: true,
      showVertexToolTips: true
    }
  }
];

const ARQuiver = {
  element: $("#ar-quiver"),
  quiver: infoView => infoView.A.ARQuiver(),
  config(infoView) {
    return {
      handler: {
        vertexClicked(v) {
          infoView.showStringInfo(v);
        }
      },
      showVertexToolTips: true
    };
  }
};

const siltingQuiver = {
  element: $("#silting-quiver"),
  quiver: infoView => infoView.A.siltingQuiver(),
  config(infoView) {
    return {
      handler: {
        vertexClicked(v) {
          infoView.S = v.silter;
          infoView.updateSilting();
        }
      },
      layered: true
    };
  }
};

const stringStringInfo = [
  {
    element: $("#string"),
    value: infoView => infoView.selectedString
  },
  {
    element: $("#string-tau-pos"),
    value: infoView => infoView.selectedString.tauPos()
  },
  {
    element: $("#string-tau-neg"),
    value: infoView => infoView.selectedString.tauNeg()
  }
];

const stringModuleInfo = [
  {
    element: $("#string-direct-preds"),
    value: infoView => infoView.selectedString.predsAR()
  },
  {
    element: $("#string-direct-succs"),
    value: infoView => infoView.selectedString.succsAR()
  },
  {
    element: $("#string-omega-pos"),
    value: infoView => infoView.selectedString.omegaPos()
  },
  {
    element: $("#string-omega-neg"),
    value: infoView => infoView.selectedString.omegaNeg()
  }
];

const siltingModuleInfo = [
  {
    element: $("#silting-tau-pos-rigid"),
    value: infoView => infoView.S.M
  },
  {
    element: $("#silting-tau-pos-support"),
    value: infoView => infoView.S.P
  }
];

function InfoView() {
  const that = this;

  that.show = show;
  that.showStringInfo = showStringInfo;
  that.updateSilting = updateSilting;

  that.latexInfo = latexInfo;
  that.quiverInfo = quiverInfo;

  function show(A, S) {
    that.A = A;
    that.S = S;

    updateTitle();

    for (const x of visibilityConditions) {
      if (x.condition(that))
        $(`.if-not-${x.name}`).hide();
      else
        $(`.if-${x.name}`).hide();
    }

    for (const x of visibilityConditions) {
      if (x.condition(that))
        $(`.if-${x.name}`).show();
      else
        $(`.if-not-${x.name}`).show();
    }

    latexInfo.forEach(putLatexIntoContainer);
    mathJaxUpdate($("#general-info-tab-content"));

    stringyInfo.forEach(putArrayIntoContainer);

    for (const x of quiverInfo) {
      const button = $("<button class=\"show-more\">Show</button>").button().click(() => {
        fadeOut(() => x.view = putQuiverIntoContainer(x));
      });

      x.element.empty().append(button);
    }

    updateSilting();

    resetARQuiver();
    resetSiltingQuiver();

    if (that.A.isRepFinite())
      showARQuiver();
  }

  body.click(e => {
    const target = $(e.target);

    if (target.hasClass("stringy")) {
      const m = target.attr("class").match(/id-(-?\d+)/);

      if (!m)
        return;

      const id = Number(m[1]);
      let string = that.A.strings.getById(id);

      if (!string)
        string = that.A.BPI.getById(id);

      const nRgd = target.parent("#silting-tau-pos-rigid").length,
        nSpp = target.parent("#silting-tau-pos-support").length;

      if (!nRgd && !nSpp) {
        showStringInfo(string);
      }
      else {
        that.S = new Silter(that.A, that.S.M, that.S.P);
        that.S.exchange(nRgd ? string : null, nSpp ? string : null);
        updateSilting();
      }
    }
  });

  addMoreStringsButton.click(() => fadeOut(addMoreStrings));
  showSiltingQuiverButton.click(prepareToShowSiltingQuiver);
  showSiltingQuiverDialog.dialog({
    buttons: {
      Show() {
        $(this).dialog("close");
        fadeOut(showSiltingQuiver);
      },
      Cancel() {
        $(this).dialog("close");
      }
    }
  });

  function updateTitle() {
    const t = [];

    if (that.A.isSelfInjective())
      t.push("Selfinjective");

    if (that.A.isRepFinite())
      t.push("Representation-Finite");
    else if (that.A.isDomestic())
      t.push(`${that.A.elementaryBands.length}-Domestic`);

    if (t.length > 0)
      t.push("\n");

    if (that.A.isGentle())
      t.push("Gentle");
    else if (that.A.isStringAlgebra())
      t.push("String");
    else
      t.push("Special Biserial");

    t.push("Algebra");

    title.html(t.join(" ").replace(" \n ", "<br />"));
    that.title = t.filter(x => x !== "\n").join(" ");
  }

  function showStringInfo(string) {
    that.selectedString = string;

    for (const x of stringStringInfo)
      putStringIntoContainer(x);

    for (const x of stringModuleInfo)
      putModuleIntoContainer(x);

    stringInfoDialog.dialog("open").scrollTop(0);
  }

  function addMoreStrings() {
    if (!that.ARV) {
      showARQuiver();
    }
    else {
      that.ARV.quiver.addNextLayer();
      that.ARV.layout();
    }

    addMoreStringsButton.html(
      `<u>A</u>dd Strings of Length ${that.ARV.quiver.maxStringLength + 1}`
    );
  }

  function updateSilting() {
    for (const x of siltingLatexInfo)
      putLatexIntoContainer(x);

    mathJaxUpdate($("#silting-tab-content"));

    for (const x of siltingModuleInfo)
      putModuleIntoContainer(x);

    if (!that.SQV)
      return;

    for (const v of that.SQV.quiver.vertices) {
      if (v.silter.equals(that.S)) {
        that.SQV.selectVertex(v);
        that.SQV.update();
        break;
      }
    }
  }

  function resetARQuiver() {
    that.ARV = undefined;
    ARQuiver.element.empty();

    $(".ar-quiver-shown").hide();
    addMoreStringsButton.html("Show <u>A</u>R Quiver");
  }

  function resetSiltingQuiver() {
    that.SQV = undefined;
    siltingQuiver.element.empty();

    $(".silting-quiver-shown").hide();
    showSiltingQuiverButton.show();
  }

  function prepareToShowSiltingQuiver() {
    if (that.A.quiver.vertices.length > 4)
      showSiltingQuiverDialog.dialog("open");
    else
      fadeOut(showSiltingQuiver);
  }

  function showARQuiver() {
    $(".ar-quiver-shown").show();

    that.ARV = putQuiverIntoContainer(ARQuiver);
  }

  function showSiltingQuiver() {
    $(".silting-quiver-shown").show();
    showSiltingQuiverButton.hide();

    that.SQV = putQuiverIntoContainer(siltingQuiver);

    const noVertices = siltingQuiver.quiver(that).vertices.length;

    if (noVertices > 1)
      siltingQuiver.element.append($(`<div>${noVertices} vertices</div>`));

    updateSilting();
  }

  function mathJaxUpdate(element) {
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, element.get(0)]);
  }

  function fadeOut(andThen) {
    overlay.show();
    setTimeout(
      () => {
        andThen();
        overlay.hide();
      },
      0
    );
  }

  function putArrayIntoContainer(x) {
    const z = x.value(that);

    if (z !== null)
      x.element.show().html(P.arrayToHtml(z, H.withDefault(x.transform, P.stringToHtml)));
    else
      x.element.hide();
  }

  function putLatexIntoContainer(x) {
    const y = H.withDefault(x.name, "", y_ => `${y_} = `),
      z = x.value(that);

    if (z !== null)
      x.element.show().text(`$$${y}${H.withDefault(x.transform, P.numberToLatex)(z)}$$`);
    else
      x.element.hide();
  }

  function putStringIntoContainer(x) {
    x.element.html(H.withDefault(x.value(that), "<i>none</i>", P.stringToHtml));
  }

  function putModuleIntoContainer(x) {
    x.element.html(P.moduleToHtml(x.value(that)));
  }

  function putQuiverIntoContainer(x) {
    const Q = x.quiver(that),
      config = H.withDefault(
        x.config,
        quiverDefaultConfig,
        y => $.extend({}, quiverDefaultConfig, typeof y !== "function" ? y : y(that))
      );

    if (!Q)
      return undefined;

    return P.putQuiverIntoContainer(Q, x.element, config);
  }

  $("#export-as-latex").click(() => {
    FileSaver.saveAs(
      new Blob([L.exportToLatex(that)], { type: "text/x-tex;charset=utf-8" }),
      `${that.name ? that.name : "unnamed"}.tex`, true
    );
  });

  $("#export-as-pdf").click(() => {
    const form = document.createElement("form"),
      jForm = $(form),
      inputs = [
        { name: "spw", value: "2" },
        { name: "finit", value: "nothing" },
        { name: "aformat", value: "PDF" },
        { name: "compile", value: "Compile" }
      ],
      textareas = [
        { name: "quellcode", value: L.exportToLatex(that) }
      ];

    for (const x of inputs)
      form.appendChild($.extend(document.createElement("input"), x));
    for (const x of textareas)
      form.appendChild($.extend(document.createElement("textarea"), x));

    $.extend(form, {
      action: "https://latex.informatik.uni-halle.de/latex-online/latex.php",
      method: "post",
      target: "_blank",
      style: "display: none"
    });

    body.append(jForm);
    form.submit();
    jForm.remove();
  });
}

module.exports = InfoView;
