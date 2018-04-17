require("jquery-ui/tooltip");

const $ = require("jquery"),
  d3 = require("d3"),
  dagre = require("dagre"),
  H = require("../util/helper");

const toHandle = [
  "initialized",
  "canvasClicked",
  "vertexClicked",
  "vertexSelected",
  "vertexDeselect",
  "vertexDeselected",
  "vertexAdded",
  "vertexRemove",
  "vertexRemoved",
  "arrowClicked",
  "arrowDeselect",
  "arrowDeselected",
  "arrowAdded",
  "arrowRemove",
  "arrowRemoved"
];

let id = 0;

class QuiverView {
  constructor(quiver, container, config = {}) {
    ++id;

    $.extend(this,
      {
        id, quiver, container,

        showVertexNames: true,
        showArrowNames: true,
        showVertexToolTips: false,
        showArrowToolTips: false,

        handler: {},

        selectedVertex: null,
        selectedArrow: null,

        vertexClicked: false,
        arrowClicked: false,

        simulation: null
      },
      config
    );

    for (const f of toHandle) {
      if (!this.handler[f])
        this.handler[f] = () => {};
    }

    initConstants.call(this);

    this.update();

    this.handler.initialized.call(this);
  }

  update() {
    const Q = this.quiver,
      [x_min, y_min, w, h] = this.svg.attr("viewBox").split(/\s+/).map(d => Math.floor(d)),
      x_max = x_min + w,
      y_max = y_min + h;

    for (const v of Q.vertices) {
      if (v.x === undefined)
        v.x = H.randomInt(x_min, x_max);
      if (v.y === undefined)
        v.y = H.randomInt(y_min, y_max);
    }

    if (this.simulation)
      this.updateSimulation();

    this.gVGroup = this.gV.selectAll(".vertices g")
      .data(Q.vertices, d => d.id);

    this.gAGroup = this.gA.selectAll(".arrows g")
      .data(Q.arrows, d => d.id);

    // exit: vertices
    this.gVGroup.exit().remove();

    // exit: arrows
    this.gAGroup.exit().remove();

    // enter: vertices
    const gVGroupEnter = this.gVGroup.enter().append("g")
      .on("click", clicked_vertex(this))
      .call(d3.drag()
        .on("start", dragstarted_vertex(this))
        .on("drag", dragged_vertex(this))
        .on("end", dragended_vertex(this))
      );

    gVGroupEnter.append("circle")
      .attr("r", this.v_r);

    if (this.showVertexNames) {
      gVGroupEnter.append("text")
        .attr("x", this.vTxt_x)
        .attr("y", this.vTxt_y)
        .text(d => d.toString());
    }

    // enter: arrows
    const gAGroupEnter = this.gAGroup.enter().append("g")
      .on("click", clicked_arrow(this));

    gAGroupEnter.append("path")
      .attr("id", d => `path-${this.id}-${d.id}`)
      .attr("marker-end", d => `url(#arrow-tip${d.trans ? "-trans" : ""}-${this.id})`);

    if (this.showArrowNames) {
      const aTxt = gAGroupEnter.append("text")
        .attr("dx", this.aTxt_dx);

      aTxt.append("textPath")
        .attr("xlink:href", d => `#path-${this.id}-${d.id}`)
        .attr("startOffset", "50%")
        .text(d => d.toString());
    }

    // update + enter: vertices
    this.gVGroup = gVGroupEnter.merge(this.gVGroup)
      .attr("class", d => d.class ? d.class : "")
      .classed("selected", d => d === this.selectedVertex);

    if (this.showVertexToolTips)
      this.gVGroup.attr("title", d => `v${d.id}`);

    // update + enter: arrows
    this.gAGroup = gAGroupEnter.merge(this.gAGroup)
      .classed("trans", d => d.trans)
      .classed("selected", d => d === this.selectedArrow);

    if (this.showArrowToolTips)
      this.gAGroup.attr("title", d => `a${d.id}`);

    transform.call(this);

    if (this.simulation)
      this.restartSimulation();
  }

  // [<<] init + update view

  // modify quiver etc. [>>]

  selectVertex(d) {
    this.selectedVertex = d;
    this.selectedArrow = null;

    this.handler.vertexSelected.call(this, d);

    return d;
  }

  selectArrow(a) {
    this.selectedVertex = null;
    this.selectedArrow = a;

    this.handler.arrowSelected.call(this, a);

    return a;
  }

  deselectVertex() {
    this.handler.vertexDeselect.call(this);

    this.selectedVertex = null;

    this.handler.vertexDeselected.call(this);
  }

  deselectArrow() {
    this.handler.arrowDeselect.call(this);

    this.selectedArrow = null;

    this.handler.arrowDeselected.call(this);
  }

  addVertex(x, y, name, id) {
    const v = this.quiver.addVertex(name, id);

    if (!v)
      return undefined;

    v.x = x;
    v.y = y;

    this.handler.vertexAdded.call(this, v);

    return v;
  }

  addArrow(s, t, id, name) {
    const a = this.quiver.addArrow(s, t, name, id);

    if (!a)
      return undefined;

    this.handler.arrowAdded.call(this, a);

    return a;
  }

  removeVertex(v) {
    if (this.selectedVertex === v)
      this.deselectVertex();

    this.handler.vertexRemove.call(this, v);

    this.quiver.removeVertex(v);

    this.handler.vertexRemoved.call(this);
  }

  removeArrow(a) {
    if (this.selectedArrow === a)
      this.deselectArrow();

    this.handler.arrowRemove.call(this, a);

    this.quiver.removeArrow(a);

    this.handler.arrowRemoved.call(this);
  }

  clear() {
    for (const a of this.quiver.arrows)
      this.removeArrow(a);
    for (const v of this.quiver.vertices)
      this.removeVertex(v);

    this.update();
  }

  reinit(quiver) {
    this.clear();

    for (const v of quiver.vertices)
      this.addVertex(v.x, v.y, v.name, v.id);
    for (const a of quiver.arrows)
      this.addArrow(a.source, a.target, a.id, a.name);

    this.update();
  }

  // [<<] modify quiver etc.

  // force simulation [>>]

  initSimulation() {
    this.simulation = {};
    this.updateSimulation();

    return this;
  }

  updateSimulation() {
    for (const cid of this.quiver.cids)
      updateSimulation.call(this, cid);

    return this;
  }

  restartSimulation() {
    for (const cid of this.quiver.cids)
      getSimulation.call(this, cid).restart();

    return this;
  }

  killSimulation() {
    if (this.simulation) {
      for (const cid of this.quiver.cids)
        getSimulation.call(this, cid).stop();

      this.simulation = null;
    }

    return this;
  }

  toggleSimulation() {
    if (this.simulation)
      this.killSimulation();
    else
      this.initSimulation();

    return this;
  }

  layout() {
    if (this.layered) {
      layerOut.call(this);
    }
    else {
      this.initSimulation();
      for (const cid of this.quiver.cids)
        layout.call(this, cid);
      this.killSimulation();
    }

    this.fitInBox(this.stackComponents())
      .update();

    return this;
  }

  stackComponents() {
    let y_ = 0, h_ = 0, x_min_min = 0, w_max = 0, h_total = 0;

    for (const cid of this.quiver.cids) {
      const V = this.quiver.verticesByCID[cid];
      const { x_min, y_min, w, h } = this._boundingBox(V);
      const y = y_ + (h_ + h) / 2;

      centerAt(V, 0, y, x_min, y_min, w, h);

      if (2 * x_min_min + w > 0)
        x_min_min = -w / 2;

      if (w > w_max)
        w_max = w;

      h_total += h;

      [y_, h_] = [y, h];
    }

    return { x_min: x_min_min, y_min: 0, w: w_max, h: h_total };
  }

  boundingBox() {
    return this._boundingBox(this.quiver.vertices);
  }

  fitInBox(bb) {
    this.makeBestView(bb);
    this.adjustDimensions(bb);

    return this;
  }

  fitInView() {
    return this.fitInBox(this.boundingBox());
  }

  makeBestView(bb) {
    let cw = this.minViewBoxWidth;
    let ch = this.minViewBoxHeight;

    if (cw) {
      cw = cw();
      if (bb.w < cw) {
        bb.x_min -= (cw - bb.w) / 2;
        bb.w = cw;
      }
    }

    if (ch) {
      ch = ch();
      if (bb.h < ch) {
        bb.y_min -= (ch - bb.h) / 2;
        bb.h = ch;
      }
    }
  }

  adjustDimensions(bb) {
    const w_min = this.minViewBoxWidth, h_min = this.minViewBoxHeight;
    let { x_min, y_min, w, h } = bb;

    this.w = w = !w ? h : w;
    this.h = h = !h ? w : h;

    x_min = !x_min ? 0 : x_min;
    y_min = !y_min ? 0 : y_min;

    this.svg
      .attr("width", !w_min && (!h_min || h === h_min()) ? w : null)
      .attr("height", !h_min && (!w_min || w === w_min()) ? h : null)
      .attr("viewBox", [x_min, y_min, w, h].join(" "));

    this.scX = sc(x_min, x_min + w);
    this.scY = sc(y_min, y_min + h);

    return this;
  }

  _boundingBox(V) {
    const m = this.quiver.m;

    let x_min = V.first().x;
    let y_min = V.first().y;

    let x_max = x_min;
    let y_max = y_min;

    for (const v of V) {
      if (v.x < x_min)
        x_min = v.x;
      else if (v.x > x_max)
        x_max = v.x;

      const m_ = m[v.id][v.id];
      const dy = m_ > 0 ? 1.2 * this.v_r * (Math.floor(m_ / 2) + 1) : 0;

      if (v.y - dy < y_min)
        y_min = v.y - dy;
      if (v.y > y_max)
        y_max = v.y;
    }

    x_min -= 2 * this.v_r;
    y_min -= 2 * this.v_r;

    x_max += 2 * this.v_r;
    y_max += 2 * this.v_r;

    return { x_min, y_min, w: x_max - x_min, h: y_max - y_min };
  }
}

function sc(x_min, x_max) {
  return d3.scaleLinear().domain([x_min, x_max]).range([x_min, x_max]).clamp(true);
}

function initConstants() {
  const that = this;

  this.div = d3.select(this.container);
  this.svg = this.div.append("svg")
    .attr("class", "quiver-view")
    .attr("preserveAspectRatio", "xMidYMid");

  this.adjustDimensions({ h: 300 });

  this.svg
    .on("click", clicked_svg(this));

  $(this.svg.node())
    .tooltip({
      items: "[title]",
      content() {
        const title = $(this).attr("title");
        const id = title.substr(1);
        const xx = title.substr(0, 1) === "v"
          ? that.quiver.vertices
          : that.quiver.arrows;

        return xx.find(d => String(d.id) === id).toString();
      }
    });

  // arrow tip for svg paths
  this.svgDefs = this.svg.append("svg:defs");

  this.svgMarkers = [];
  this.svgMarkers.push(appendMarker.call(this, this.svgDefs));
  this.svgMarkers.push(appendMarker.call(this, this.svgDefs, "-trans"));

  // circumvent bug in IE 11
  this.svgDefsNode = this.svgDefs.node();
  this.svgMarkerNodes = this.svgMarkers.map(m => m.node());

  this.gV = this.svg.append("g").attr("class", "vertices");
  this.gA = this.svg.append("g").attr("class", "arrows");

  this.v_r = 10;
  this.vTxt_x = 0.2;
  this.vTxt_y = 4.3;

  this.a_shift = 5;
  this.aTip_shift = 2;
  this.a_pad = 3;
  this.a_bend_pad = 1;
  this.aTxt_dx = 0;
  this.aTxt_dy = -3;
}

function transform() {
  this.gVGroup
    .attr("transform", d => `translate(${this.scX(d.x)},${this.scY(d.y)})`);

  this.gAGroup
    .attr("transform", d => {
      d.dsx = this.scX(d.source.x);
      d.dtx = this.scX(d.target.x);

      d.dsy = this.scY(d.source.y);
      d.dty = this.scY(d.target.y);

      d.dx = d.dtx - d.dsx;
      d.dy = d.dty - d.dsy;

      d.dpc = H.polarCoordinates(d.dx, d.dy);

      return [
        "translate(", d.dsx, d.dsy, ")",
        "rotate(", d.dpc.arg ? d.dpc.arg : 0, ")"
      ].join(" ");
    });

  this.gAGroup.selectAll("path")
    .attr("d", d => {
      const m_ = this.quiver.m[d.target.id][d.source.id];
      let x, y, r;

      if (d.source !== d.target) {
        const dr = d.dpc.r;
        let q = d.m_id;

        y = -q * this.a_shift;

        if (m_ > 0) {
          y -= this.a_shift / 2;
        }
        else if (this.quiver.m[d.source.id][d.target.id] > 1) {
          y += this.a_shift / 2;
          if (d.m_id !== 0)
            --q;
        }

        x = this.v_r + this.a_pad - (q * q * this.a_bend_pad);
        r = q ? dr * dr / q / 150 : 0;

        return [
          "M", x, y,
          "A", r, r, 1, 0, 1, dr - x - this.aTip_shift, y
        ].join(" ");
      }
      else {
        const m_id_d2 = Math.floor(d.m_id / 2);

        y = this.v_r;
        x = this.v_r + (5 * m_id_d2);
        r = 1.2 * this.v_r * (m_id_d2 + 1);

        if (m_ > 1 && d.m_id % 2) {
          return [
            "M", x, y,
            "A", r, r, 1, 1, 1, -x - this.aTip_shift, y
          ].join(" ");
        }
        else {
          return [
            "M", -x, -y,
            "A", r, r, 1, 1, 1, x + this.aTip_shift, -y
          ].join(" ");
        }
      }
    });

  if (this.showArrowNames) {
    this.gAGroup.selectAll("text")
      .attr("dy", d => {
        const dy = this.aTxt_dy;
        const m_ = this.quiver.m[d.target.id][d.source.id];
        const n_ = this.quiver.m[d.source.id][d.target.id];

        if (d.m_id === 0 && m_ === 0 && n_ > 1)
          return -dy + this.a_shift;

        return dy;
      });
  }

  if (H.runningInIE())
    removeAndAppendMarker.call(this);
}

// circumvent bug in IE 11
function removeAndAppendMarker() {
  for (const m of this.svgMarkerNodes) {
    this.svgDefsNode.removeChild(m);
    this.svgDefsNode.appendChild(m);
  }
}

// handle clicks [>>]

function clicked_vertex(that_) {
  return v => {
    that_.vertexClicked = true;

    that_.handler.vertexClicked.call(that_, v);
  };
}

function clicked_arrow(that_) {
  return a => {
    that_.arrowClicked = true;

    that_.handler.arrowClicked.call(that_, a);
  };
}

function clicked_svg(that_) {
  return function() {
    if (that_.vertexClicked || that_.arrowClicked) {
      that_.vertexClicked = that_.arrowClicked = false;

      return;
    }

    that_.handler.canvasClicked.call(that_, d3.mouse(this));
  };
}

// [<<] handle clicks

// handle drags [>>]

function dragstarted_vertex(that_) {
  return () => {
    if (that_.simulation && !d3.event.active) {
      for (const cid of that_.quiver.cids)
        that_.simulation[cid].alphaTarget(1).restart();
    }
  };
}

function dragged_vertex(that_) {
  return v => {
    d3.select(this).select(".vertex")
      .attr("x", v.fx = v.x = d3.event.x)
      .attr("y", v.fy = v.y = d3.event.y);
    that_.update();
  };
}

function dragended_vertex(that_) {
  return v => {
    if (that_.simulation && !d3.event.active) {
      for (const cid of that_.quiver.cids)
        that_.simulation[cid].alphaTarget(0);
    }
    v.fx = v.fy = null;
  };
}

function appendMarker(svgDefs, suffix = "") {
  const svgMarker = svgDefs.append("svg:marker")
    .attr("id", `arrow-tip${suffix}-${this.id}`)
    .attr("class", `arrow-tip${suffix}`)
    .attr("viewBox", "-9 -9 18 18")
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("markerUnits", "userSpaceOnUse")
    .attr("orient", "auto");

  svgMarker
    .append("polygon")
    .attr("points", "-3,0 -7,7 7,0 -7,-7");

  return svgMarker;
}

function getSimulation(cid) {
  if (!this.simulation[cid]) {
    const Q = this.quiver;

    this.simulation[cid] = d3.forceSimulation()
      .force("charge", d3.forceManyBody().strength(-400))
      .force("arrow", d3.forceLink().id(d => d.id).strength(d => {
        const x = d.name.length;

        return 1 /
          Math.min(
            Q.as_o[d.source.id].length + Q.as_i[d.source.id].length,
            Q.as_o[d.target.id].length + Q.as_i[d.target.id].length
          ) /
          (x * (x - 1) + 1);
      }))
      // .force("center", d3.forceCenter(this.w / 2, this.h / 2))
      .force("x", d3.forceY().strength(0.01))
      .on("tick", () => transform.call(this));
  }

  return this.simulation[cid];
}

function updateSimulation(cid) {
  const simulation = getSimulation.call(this, cid);
  const nodes = this.quiver.verticesByCID[cid];
  const links = this.quiver.arrowsByCID[cid];

  const dist = Math.max(
    this.w / Math.pow(nodes.length, 2),
    6 * this.v_r
  );

  simulation
    .nodes(nodes);

  simulation
    .force("arrow")
    .links(links)
    .distance(dist);
}

function layout(cid) {
  const simulation = getSimulation.call(this, cid);

  simulation.alphaTarget(1);

  const n = Math.ceil(
    Math.log(simulation.alphaMin()) /
    Math.log(1 - simulation.alphaDecay())
  );

  for (let i = 0; i < n; ++i)
    simulation.tick();
}

function layerOut() {
  const g = new dagre.graphlib.Graph();

  g.setGraph({ ranksep: 100 });
  g.setDefaultEdgeLabel(() => {
    return {};
  });

  for (const v of this.quiver.vertices)
    g.setNode(v.id, { label: v, width: 5, height: 5 });
  for (const a of this.quiver.arrows)
    g.setEdge(a.source.id, a.target.id);

  dagre.layout(g);

  g.nodes().forEach(i => {
    const node = g.node(i);

    node.label.x = node.x;
    node.label.y = node.y;
  });
}

function centerAt(V, x, y, x_min, y_min, w, h) {
  const dx = x - (x_min + w / 2);
  const dy = y - (y_min + h / 2);

  for (const v of V) {
    v.x += dx;
    v.y += dy;
  }
}

// [<<] handle drags

module.exports = QuiverView;
