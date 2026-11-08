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
    const result = { ...group, index, paths: [], junctions: [], linkedIds: [...group.parentIds, ...group.children] };
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
    for (const p of parents) result.paths.push(`M${p.x + p.width / 2} ${p.y + p.height} V${parentY}`);
    result.paths.push(`M${Math.min(...px)} ${parentY} H${Math.max(...px)}`);
    result.paths.push(`M${joint} ${parentY} V${childY}`);
    result.paths.push(`M${Math.min(joint, ...cx)} ${childY} H${Math.max(joint, ...cx)}`);
    for (const c of children) result.paths.push(`M${c.x + c.width / 2} ${childY} V${c.y}`);
    result.junctions.push({ x: joint, y: parentY }, { x: joint, y: childY });
    return result;
  });
}

// A light halo makes crossings look like crossings, not additional junctions.
// Junction dots are added only where the captured family actually branches.
export function connectionMarkup(connections, selectedId = null) {
  return connections.filter(group => group.paths.length)
    .sort((a, b) => Number(a.linkedIds.includes(selectedId)) - Number(b.linkedIds.includes(selectedId))).map(group => {
    const related = selectedId && group.linkedIds.includes(selectedId);
    const paths = group.paths.map(d => `<path d="${d}"/>`).join('');
    return `<g class="family-connection${related ? ' related' : ''}"><g class="connection-halo">${paths}</g><g class="connection-ink">${paths}${group.junctions.map(p => `<circle cx="${p.x}" cy="${p.y}" r="2.5"/>`).join('')}</g></g>`;
  }).join('');
}
