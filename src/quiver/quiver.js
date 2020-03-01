import "../util/array-extensions";

import $ from "jquery";
import H from "../util/helper";
import Path from "./path";

function Quiver() {
  const that = this;

  construct();
  exportMethods();

  function construct() {
    that.vertices = [];
    that.arrows = [];

    // adjacency matrix
    that.m = {};

    // in and out arrows by vertex
    that.as_i = {};
    that.as_o = {};

    // loop count
    that.l = 0;

    // components
    that.verticesByCID = {};
    that.arrowsByCID = {};
    that.lastCID = -1;
    that.cids = new Set();

    that.paths = [];
  }

  function exportMethods() {
    that.vertex = vertex;
    that.arrow = arrow;

    that.isEmpty = isEmpty;
    that.arrowMultiplicity = arrowMultiplicity;

    that.addVertex = addVertex;
    that.addArrow = addArrow;
    that._addVertex = _addVertex;
    that._addArrow = _addArrow;
    that.removeVertex = removeVertex;
    that.removeArrow = removeArrow;

    that.vertexIdFunc = x => x;
    that.arrowIdFunc = x => x;

    that.maxPathLength = maxPathLength;
    that.path = path;
    that.stripped = stripped;
  }

  function vertex(v) {
    return find(that.vertices, v);
  }

  function arrow(a) {
    return find(that.arrows, a);
  }

  function find(data, d) {
    return data.find(e => e === d || e.id === d);
  }

  function isEmpty() {
    return that.vertices.length === 0;
  }

  function arrowMultiplicity(s_id, t_id) {
    return that.m[s_id][t_id];
  }

  function addVertex(name, id) {
    if (that.vertex(id))
      return undefined;

    id = id === undefined ? freeVertexId() : id;

    if (id === undefined)
      return undefined;

    name = name === undefined ? String(id) : name;

    const vertex = {
      id,
      name,
      toString() {
        return this.name;
      }
    };

    return _addVertex(vertex);
  }

  function _addVertex(vertex) {
    const cid = vertex.cid = ++that.lastCID;

    that.vertices.push(vertex);
    that.verticesByCID[cid] = [vertex];
    that.arrowsByCID[cid] = [];
    that.cids.add(cid);

    that.m[vertex.id] = {};
    that.vertices.forEach(d => {
      that.m[vertex.id][d.id] = that.m[d.id][vertex.id] = 0;
    });

    that.as_i[vertex.id] = [];
    that.as_o[vertex.id] = [];

    return vertex;
  }

  function addArrow(source, target, name, id) {
    if (that.arrow(id))
      return undefined;

    id = id === undefined ? freeArrowId() : id;

    if (id === undefined)
      return undefined;

    name = name === undefined ? String(id) : name;

    source = that.vertex(source);
    target = that.vertex(target);

    if (!source || !target)
      return undefined;

    const arrow = {
      id,
      source,
      target,
      name,
      toString() {
        return this.name;
      }
    };

    return _addArrow(arrow);
  }

  function _addArrow(arrow) {
    const s = arrow.source;
    const t = arrow.target;

    const s_id = s.id;
    const t_id = t.id;

    arrow.m_id = that.m[s_id][t_id];

    that.arrows.push(arrow);
    that.arrowsByCID[s.cid].push(arrow);

    that.as_i[t_id].push(arrow);
    that.as_o[s_id].push(arrow);

    ++that.m[s_id][t_id];

    if (s_id === t_id)
      ++that.l;

    if (s.cid !== t.cid)
      joinComponents(s.cid, t.cid);

    return arrow;
  }

  function joinComponents(cid1, cid2) {
    if (that.verticesByCID[cid1].length < that.verticesByCID[cid2].length)
      [cid1, cid2] = [cid2, cid1];

    for (const et of ["verticesByCID", "arrowsByCID"]) {
      for (const x of that[et][cid2])
        x.cid = cid1;

      that[et][cid1].push(...that[et][cid2]);
      that[et][cid2] = undefined;
    }

    that.cids.delete(cid2);
  }

  function removeVertex(v) {
    v = that.vertex(v);

    that.arrows.forEach(arrow => {
      if (arrow.source === v || arrow.target === v)
        that.removeArrow(arrow);
    });

    that.vertices = that.vertices.filter(w => w !== v);

    that.m[v.id] = null;
    that.vertices.forEach(w => {
      that.m[w.id][v.id] = null;
    });
  }

  function removeArrow(a) {
    a = that.arrow(a);

    that.arrows = that.arrows.filter(arrow => arrow !== a);

    that.as_i[a.target.id] = that.as_i[a.target.id].filter(arrow => arrow !== a);
    that.as_o[a.source.id] = that.as_o[a.source.id].filter(arrow => arrow !== a);

    that.arrows.forEach(b => {
      if (b.source === a.source && b.target === a.target) {
        if (b.m_id > a.m_id)
          --b.m_id;
      }
    });

    --that.m[a.source.id][a.target.id];

    if (a.source.id === a.target.id)
      --that.l;
  }

  function freeVertexId() {
    return freeId(that.vertices, that.vertexIdFunc);
  }

  function freeArrowId() {
    return freeId(that.arrows, that.arrowIdFunc);
  }

  function maxPathLength() {
    const N = that.vertices.length;

    if (N === 0)
      return undefined;

    let res = 0, changed = true;

    for (const v of that.vertices)
      v._maxPSH = 0;

    while (changed) {
      changed = false;

      for (const a of that.arrows) {
        const m = a.source._maxPSH;
        const n = a.target._maxPSH + 1;

        if (n <= m)
          continue;

        a.source._maxPSH = n;
        res = Math.max(res, n);

        if (res >= N)
          return Infinity;

        changed = true;
      }
    }

    return res;
  }

  function path(arg) {
    const isTrivial = !Array.isArray(arg);

    const arrows = isTrivial ? [] : arg;
    const length = isTrivial ? 0 : arg.length;
    const source = isTrivial ? arg : null;

    while (length >= that.paths.length)
      that.paths.push([]);

    const I = that.paths[length];
    const y = I.binaryFindIndex({ arrows, length, source }, Path.compare);

    if (y.found)
      return I[y.index];

    const res = new Path(arg);

    I.splice(y.index, 0, res);

    return res;
  }

  function stripped() {
    const res = { vertices: [], arrows: [] };

    for (const v of that.vertices)
      res.vertices.push({ id: v.id, x: v.x, y: v.y });
    for (const a of that.arrows)
      res.arrows.push({ id: a.id, source: a.source.id, target: a.target.id });

    return res;
  }
}

function freeId(inUse, possibleIds) {
  const ids = [];

  for (let i = inUse.length; i >= 0; --i)
    ids.insertSorted(possibleIds(i), H.compare);
  inUse.forEach(d => ids.binaryFindAndRemove(d.id, H.compare));

  return ids.first();
}

Quiver.clone = function(other) {
  const q = new Quiver();

  q.vertexIdFunc = other.vertexIdFunc;
  q.arrowIdFunc = other.arrowIdFunc;

  for (const v of other.vertices)
    $.extend(q.addVertex(v.name, v.id), { x: v.x, y: v.y });

  for (const a of other.arrows)
    q.addArrow(a.source.id, a.target.id, a.name, a.id);

  return q;
};

export default Quiver;
