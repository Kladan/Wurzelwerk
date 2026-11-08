// Presentation geometry shared by screen and print. Coordinates come from cards,
// never from user text. Generational membership is supplied by the domain layer.
const laneSpacing = 12;
export function connectionGap(generation = []) {
  const count = new Set(generation.filter(p => p.parentIds.length).map(p => JSON.stringify([...p.parentIds].sort()))).size;
  return Math.max(60, 32 + (2 * count - 1) * laneSpacing);
}

export function familyConnections(tree, nodes) {
  const families = new Map();
  for (const child of tree.people) {
    if (!child.parentIds.length || !nodes.has(child.id)) continue;
    const node = nodes.get(child.id);
    const key = JSON.stringify([node.row, [...child.parentIds].sort()]);
    if (!families.has(key)) families.set(key, { parentIds: [...child.parentIds].sort(), children: [], row: node.row });
    families.get(key).children.push(child.id);
  }
  const groups = [...families.values()].sort((a, b) => a.row - b.row ||
    Math.min(...a.children.map(id => nodes.get(id).x)) - Math.min(...b.children.map(id => nodes.get(id).x)));
  const rows = new Map();
  for (const group of groups) {
    const list = rows.get(group.row) ?? [];
    list.push(group); rows.set(group.row, list);
  }
  const routes = new Map();
  for (const lanes of rows.values()) {
    const uses = new Map();
    for (const group of lanes) for (const id of group.parentIds) {
      if (nodes.get(id)?.row !== group.row - 1) continue;
      if (!uses.has(id)) uses.set(id, []);
      uses.get(id).push(group);
    }
    const anchors = [];
    for (const group of lanes) {
      const parents = group.parentIds.filter(id => uses.has(id)).map(id => nodes.get(id));
      const px = group.parentIds.filter(id => uses.has(id)).map(id => {
        const node = nodes.get(id), families = uses.get(id);
        const step = families.length > 1 ? Math.min(laneSpacing, Math.max(0, node.width - 32) / (families.length - 1)) : 0;
        return node.x + node.width / 2 + (families.indexOf(group) - (families.length - 1) / 2) * step;
      });
      const cx = group.children.map(id => nodes.get(id).x + nodes.get(id).width / 2);
      routes.set(group, { parents, px, cx });
      anchors.push(...[...px, ...cx].map(x => ({ x, group })));
    }
    const columns = [];
    for (const group of lanes) {
      const route = routes.get(group);
      if (!route.parents.length) continue;
      const cards = [...route.parents, ...group.children.map(id => nodes.get(id))];
      const preferred = (Math.min(...route.px) + Math.max(...route.px)) / 2;
      route.joint = freeColumn(preferred, [...anchors.filter(a => a.group !== group).map(a => a.x), ...columns],
        Math.min(...cards.map(c => c.x)) + 16, Math.max(...cards.map(c => c.x + c.width)) - 16);
      columns.push(route.joint);
    }
  }
  return groups.map((group, index) => {
    const children = group.children.map(id => nodes.get(id));
    // Long links would run through unrelated cards. Card references retain these
    // relationships explicitly, rather than implying a different generation.
    const { parents, px, cx, joint } = routes.get(group);
    const routeIds = group.parentIds.filter(id => nodes.get(id)?.row === group.row - 1);
    const result = { ...group, index, paths: [], segments: [], junctions: [], linkedIds: [...group.parentIds, ...group.children],
      routeIds: [...routeIds, ...group.children] };
    if (!parents.length) return result;
    const lanes = rows.get(group.row);
    const bottom = Math.max(...parents.map(p => p.y + p.height));
    const top = Math.min(...children.map(p => p.y));
    const gap = top - bottom;
    // Two banks of evenly spaced lanes, with room at both card edges.
    // Limit spacing defensively when a caller supplies a narrower corridor.
    const spacing = Math.min(laneSpacing, Math.max(0, (gap - 32) / (2 * lanes.length - 1)));
    const inset = (gap - (2 * lanes.length - 1) * spacing) / 2;
    const parentY = bottom + inset + lanes.indexOf(group) * spacing;
    const childY = parentY + lanes.length * spacing;
    const line = (x1, y1, x2, y2) => {
      if (x1 === x2 && y1 === y2) return;
      result.paths.push(`M${x1} ${y1} L${x2} ${y2}`);
      result.segments.push({ x1, y1, x2, y2 });
    };
    parents.forEach((p, i) => line(px[i], p.y + p.height, px[i], parentY));
    line(Math.min(joint, ...px), parentY, Math.max(joint, ...px), parentY);
    line(joint, parentY, joint, childY);
    line(Math.min(joint, ...cx), childY, Math.max(joint, ...cx), childY);
    for (const c of children) line(c.x + c.width / 2, childY, c.x + c.width / 2, c.y);
    roundConnection(result);
    return result;
  });
}

// Prefer the original midpoint, but never share a vertical track with another
// family or its card stems. Own aligned stems can remain perfectly straight.
function freeColumn(preferred, blocked, left, right) {
  const sorted = blocked.toSorted((a, b) => a - b);
  // Extremely crowded card ports may need less than the normal 12 px clearance.
  for (let clearance = laneSpacing; clearance > .01; clearance /= 2) {
    let start = left, best = null;
    const consider = end => {
      if (start > end) return;
      const x = Math.max(start, Math.min(end, preferred));
      if (best === null || Math.abs(x - preferred) < Math.abs(best - preferred)) best = x;
    };
    for (const x of sorted) {
      consider(Math.min(right, x - clearance));
      start = Math.max(start, x + clearance);
    }
    consider(right);
    if (best !== null) return best;
  }
  return Math.max(left, Math.min(right, preferred));
}

// Split buses at their branches before rounding. Only degree-two elbows bend;
// T junctions stay connected and receive a dot, straight joins receive neither.
function roundConnection(group) {
  const vertices = new Map();
  const vertex = (x, y) => {
    const key = `${x}:${y}`;
    if (!vertices.has(key)) vertices.set(key, { x, y, edges: [] });
    return vertices.get(key);
  };
  for (const s of group.segments) { vertex(s.x1, s.y1); vertex(s.x2, s.y2); }
  const edges = [];
  for (const s of group.segments) {
    const points = s.y1 === s.y2 ? [...vertices.values()].filter(p => p.y === s.y1 && p.x >= Math.min(s.x1, s.x2) && p.x <= Math.max(s.x1, s.x2)).sort((a, b) => a.x - b.x)
      : [vertex(s.x1, s.y1), vertex(s.x2, s.y2)];
    for (let i = 1; i < points.length; i++) {
      const edge = { a: points[i - 1], b: points[i] };
      edges.push(edge); edge.a.edges.push(edge.b); edge.b.edges.push(edge.a);
    }
  }
  const towards = (p, other, distance) => {
    const length = Math.hypot(other.x - p.x, other.y - p.y);
    return { x: p.x + (other.x - p.x) * distance / length, y: p.y + (other.y - p.y) * distance / length };
  };
  group.curves = [];
  for (const p of vertices.values()) {
    if (p.edges.length >= 3) group.junctions.push({ x: p.x, y: p.y });
    if (p.edges.length !== 2) continue;
    const [a, b] = p.edges;
    if ((a.x - p.x) * (b.y - p.y) === (a.y - p.y) * (b.x - p.x)) continue;
    p.radius = Math.min(8, Math.hypot(a.x - p.x, a.y - p.y) / 2, Math.hypot(b.x - p.x, b.y - p.y) / 2);
    group.curves.push({ start: towards(p, a, p.radius), corner: { x: p.x, y: p.y }, end: towards(p, b, p.radius) });
  }
  group.segments = edges.map(({ a, b }) => {
    const start = a.radius ? towards(a, b, a.radius) : a;
    const end = b.radius ? towards(b, a, b.radius) : b;
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  });
  group.paths = group.segments.map(s => `M${s.x1} ${s.y1} L${s.x2} ${s.y2}`);
}

// A light halo makes crossings look like crossings, not additional junctions.
// Junction dots are added only where the captured family actually branches.
export function connectionMarkup(connections, selectedId = null, bounds = null) {
  return connections.filter(group => group.paths.length)
    .sort((a, b) => Number(a.linkedIds.includes(selectedId)) - Number(b.linkedIds.includes(selectedId))).map(group => {
    const related = selectedId && group.linkedIds.includes(selectedId);
    const segments = bounds ? group.segments.filter(s => Math.max(s.x1, s.x2) >= bounds.x && Math.min(s.x1, s.x2) <= bounds.x + bounds.width &&
      Math.max(s.y1, s.y2) >= bounds.y && Math.min(s.y1, s.y2) <= bounds.y + bounds.height).map(s => {
      const x = value => Math.max(bounds.x, Math.min(bounds.x + bounds.width, value));
      const y = value => Math.max(bounds.y, Math.min(bounds.y + bounds.height, value));
      return `M${x(s.x1)} ${y(s.y1)} L${x(s.x2)} ${y(s.y2)}`;
    }) : group.paths;
    const curves = (group.curves ?? []).filter(({ start, corner, end }) => !bounds ||
      Math.max(start.x, corner.x, end.x) >= bounds.x && Math.min(start.x, corner.x, end.x) <= bounds.x + bounds.width &&
      Math.max(start.y, corner.y, end.y) >= bounds.y && Math.min(start.y, corner.y, end.y) <= bounds.y + bounds.height)
      .map(({ start, corner, end }) => `M${start.x} ${start.y} Q${corner.x} ${corner.y} ${end.x} ${end.y}`);
    const paths = [...segments, ...curves].map(d => `<path d="${d}"/>`).join('');
    const junctions = group.junctions.filter(p => !bounds || p.x >= bounds.x && p.x <= bounds.x + bounds.width && p.y >= bounds.y && p.y <= bounds.y + bounds.height);
    const markup = `<g class="family-connection${related ? ' related' : ''}"><g class="connection-halo">${paths}</g><g class="connection-ink">${paths}${junctions.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5"/>`).join('')}</g></g>`;
    // Clip curves at page edges without changing their shape or inventing elbows.
    return bounds ? `<svg x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" overflow="hidden">${markup}</svg>` : markup;
  }).join('');
}
