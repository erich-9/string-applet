import $ from "jquery";
import FileSaver from "file-saver";
import Quiver from "./quiver/quiver";
import QuiverView from "./quiver/quiver-view";

const statusMessage = $("#quiver-status-message p"),
  quiverEditor = $("#quiver-editor"),
  relationsTextArea = $("#relations"),
  saveInCacheName = $("#save-in-cache-name"),
  saveInCacheDialog = $("#save-in-cache-dialog").dialog({
    autoOpen: false,
    height: "auto",
    modal: true,
    position: { my: "center", at: "center", of: quiverEditor },
    resizable: false,
    width: 380
  });

const messages = {
  default: "To add a vertex, click somewhere.",
  vertexSelected:
    [
      "To add an arrow, click on the target.",
      "Remove with <i>Delete</i>. Deselect with <i>Escape</i>."
    ]
      .join("\n"),
  arrowSelected: "Remove with <i>Delete</i>. Deselect with <i>Escape</i>."
};

function QuiverEditor(quiver) {
  const that = this;

  that.quiver = quiver ? quiver : new Quiver();
  that.loadFromString = loadFromString;
  that.loadFromObject = loadFromObject;

  $("#clear").click(clear);

  $("#load-from-cache").hover(() => {
    const cached = $("#cached").empty();

    for (let i = 0, l = localStorage.length; i < l; ++i) {
      const m = /^string-applet\{(.*)\}$/.exec(localStorage.key(i));

      if (m === null)
        continue;

      cached.append(
        $(`<li><div>${m[1]}</div></li>`)
          .click(() => loadFromString(localStorage.getItem(m[0]), m[1]))
      );
    }

    cached.menu().menu("refresh");
  });

  $("#load-from-file").change(() => {
    const files = document.getElementById("local-file").files;

    if (!files || !files[0])
      return;

    const file = files[0], reader = new FileReader();

    reader.onload = e => loadFromString(e.target.result, /^[^.]*/.exec(file.name));
    reader.readAsText(file);

    document.getElementById("load-from-file-form").reset();
  });

  $("#save-in-cache").click(() => {
    saveInCacheName.val(that.name);
    saveInCacheDialog.dialog("open");
  });

  $("#save-as-file").click(() => {
    FileSaver.saveAs(
      new Blob([stringified()], { type: "text/plain;charset=utf-8" }),
      `${that.name ? that.name : "unnamed"}.sba`, true
    );
  });

  saveInCacheDialog.dialog({
    buttons: {
      Save() {
        const key = saveInCacheName.val().trim();

        if (key.length > 0) {
          saveInCache(key);
          $(this).dialog("close");
        }
      },
      Cancel() {
        $(this).dialog("close");
      }
    }
  });

  const handler = {
    canvasClicked(pos) {
      const v = this.addVertex(pos[0], pos[1]);

      if (this.selectedVertex) {
        this.addArrow(this.selectedVertex, v);
        this.deselectVertex();
      }
      if (this.selectedArrow)
        this.deselectArrow();

      this.update();
    },
    vertexClicked(v) {
      if (this.selectedVertex) {
        this.addArrow(this.selectedVertex, v);
        this.deselectVertex();
      }
      else {
        this.selectVertex(v);
      }
      this.update();
    },
    arrowClicked(a) {
      this.selectArrow(a);
      this.update();
    },
    vertexSelected() {
      setStatus(messages.vertexSelected);
    },
    arrowSelected() {
      setStatus(messages.arrowSelected);
    }
  };

  for (const h of ["initialized", "vertexDeselect", "arrowDeselect"])
    handler[h] = setStatus;

  const view = new QuiverView(that.quiver, quiverEditor[0], { handler });

  $(view.container).keyup(e => {
    if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)
      return;

    switch (e.keyCode) {
    case 27: /* escape */
      view.deselectVertex();
      view.deselectArrow();
      view.update();
      break;

    case 8: /* backspace */
    case 46: /* delete */
    case 109: /* '-' */
      if (view.selectedArrow) {
        view.removeArrow(view.selectedArrow);
        view.update();
      }
      if (view.selectedVertex) {
        view.removeVertex(view.selectedVertex);
        view.update();
      }
      break;

    default:
      return;
    }
  });

  function setStatus(msg) {
    if (msg === undefined)
      msg = messages.default;

    statusMessage.html(msg);
  }

  function clear() {
    that.name = "";
    view.clear();
    relationsTextArea.val("");
    setStatus();
  }

  function loadFromString(str, name = "") {
    try {
      loadFromObject(JSON.parse(str), name);
    }
    catch (e) {
      error("Parsing error", "Invalid JSON input received.");
    }
  }

  function loadFromObject(obj, name = "") {
    try {
      const { quiver, relations } = obj;

      if (!quiver || !quiver.vertices || !quiver.arrows)
        throw new Error();

      view.reinit(quiver);
      relationsTextArea.val(relations);

      that.name = name;
    }
    catch (e) {
      error("Invalid Algebra", "Please provide a valid input format.");
    }
  }

  function saveInCache(key) {
    localStorage.setItem(`string-applet{${key}}`, stringified());
    that.name = key;
  }

  function stringified() {
    return JSON.stringify(
      {
        quiver: that.quiver.stripped(),
        relations: relationsTextArea.val()
      },
      (k, v) => v.toFixed ? Number(v.toFixed(3)) : v,
      2
    );
  }

  that.view = view;
  that.clear = clear;
}

function error(title, str) {
  $("#error-message").html(str);
  $("#error-dialog").dialog({ title, autoOpen: true });
}

export default QuiverEditor;
