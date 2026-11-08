// Presentation geometry shared by screen and print. Coordinates come from cards,
// never from user text. Generational membership is supplied by the domain layer.
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
  return groups.map((group, index) => {
    const children = group.children.map(id => nodes.get(id));
    // Long links would run through unrelated cards. Card references retain these
    // relationships explicitly, rather than implying a different generation.
    const parents = group.parentIds.map(id => nodes.get(id)).filter(node => node && node.row === group.row - 1);
    const routeIds = group.parentIds.filter(id => nodes.get(id)?.row === group.row - 1);
    const result = { ...group, index, paths: [], segments: [], junctions: [], linkedIds: [...group.parentIds, ...group.children],
      routeIds: [...routeIds, ...group.children] };
    if (!parents.length) return result;
    const lanes = rows.get(group.row);
    const lane = (lanes.indexOf(group) + 1) / (lanes.length + 1);
    const bottom = Math.max(...parents.map(p => p.y + p.height));
    const top = Math.min(...children.map(p => p.y));
    const gap = top - bottom;
    const parentY = bottom + gap * (.10 + .25 * lane);
    const childY = bottom + gap * (.40 + .50 * lane);
    const px = parents.map(p => p.x + p.width / 2);
    const cx = children.map(p => p.x + p.width / 2);
    const joint = (Math.min(...px) + Math.max(...px)) / 2;
    const line = (x1, y1, x2, y2) => {
      if (x1 === x2 && y1 === y2) return;
      result.paths.push(`M${x1} ${y1} L${x2} ${y2}`);
      result.segments.push({ x1, y1, x2, y2 });
    };
    for (const p of parents) line(p.x + p.width / 2, p.y + p.height, p.x + p.width / 2, parentY);
    line(Math.min(...px), parentY, Math.max(...px), parentY);
    line(joint, parentY, joint, childY);
    line(Math.min(joint, ...cx), childY, Math.max(joint, ...cx), childY);
    for (const c of children) line(c.x + c.width / 2, childY, c.x + c.width / 2, c.y);
    result.junctions.push({ x: joint, y: parentY }, { x: joint, y: childY });
    return result;
  });
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
    const paths = segments.map(d => `<path d="${d}"/>`).join('');
    const junctions = group.junctions.filter(p => !bounds || p.x >= bounds.x && p.x <= bounds.x + bounds.width && p.y >= bounds.y && p.y <= bounds.y + bounds.height);
    return `<g class="family-connection${related ? ' related' : ''}"><g class="connection-halo">${paths}</g><g class="connection-ink">${paths}${junctions.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5"/>`).join('')}</g></g>`;
  }).join('');
}
