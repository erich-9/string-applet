import "jquery-ui/button";
import "jquery-ui/dialog";
import "jquery-ui/menu";

import $ from "jquery";
import Examples from "./examples";
import H from "./util/helper";
import InfoView from "./info-view";
import QuiverEditor from "./quiver-editor";
import Silter from "./sba/silter";
import SpecialBiserialAlgebra from "./sba/algebra";

const exampleMenu = $("#examples"),
  errorDialog = $("#error-dialog").dialog({
    autoOpen: false,
    dialogClass: "error-dialog",
    height: "auto",
    modal: true,
    position: { my: "center", at: "center", of: "#editor" },
    resizable: false,
    width: 380
  }),
  errorMessage = $("#error-message"),
  relationsTextArea = $("#relations");

const infoView = new InfoView(),
  quiverEditor = new QuiverEditor(),
  searchParams = new URLSearchParams(window.location.search);

$.extend(quiverEditor.view.quiver, {
  vertexIdFunc: x => x + 1,
  arrowIdFunc: x => x < 26 ? String.fromCharCode(97 + x) : null
});

for (const key in Examples) {
  exampleMenu.append(
    $(`<li><div>${key}</div></li>`)
      .click(() => loadExample(key))
  );
}

$(() => {
  if (window.stringifiedSBA) {
    quiverEditor.loadFromString(window.stringifiedSBA);
  }
  else {
    let exampleKey = searchParams.get("example");

    if (!(exampleKey in Examples))
      exampleKey = H.randomKey(Examples);

    loadExample(exampleKey);
  }

  $("#quiver-editor");
  $("#article-list").load("./refs.html");

  $("#update")
    .click(update);

  $("#menu").menu();

  update();
  hideSpinner();
});

function update() {
  try {
    const A = new SpecialBiserialAlgebra(quiverEditor.quiver, relationsTextArea.val());
    const S = new Silter(A, A, null);

    infoView.show(A, S);
    infoView.name = quiverEditor.name;
  }
  catch (e) {
    if (!e.userDefined)
      throw e;

    errorMessage.html(e.message);
    errorDialog.dialog({ title: "Update Failed", autoOpen: true });
  }
}

function loadExample(key) {
  quiverEditor.loadFromObject(Examples[key], key);
}

function hideSpinner() {
  $("#spinner").hide();
  $("body").css("overflow", "scroll");
}
