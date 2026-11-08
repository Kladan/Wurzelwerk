const PERSON_FIELDS = ['firstName', 'lastName', 'birthName', 'birthDate', 'birthPlace', 'deathDate', 'deathPlace', 'notes', 'sources'];
const MAX_PEOPLE = 5000;

function text(value, field, max = 500) {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${field}: ungültiger oder zu langer Text.`);
  return value.trim();
}

function date(value, field) {
  const normalized = text(value, field, 10);
  if (!normalized) return '';
  if (!/^\d{4}(-\d{2})?(-\d{2})?$/.test(normalized)) throw new Error(`${field}: Bitte Jahr, Jahr-Monat oder Jahr-Monat-Tag verwenden.`);
  const [year, month = 1, day = 1] = normalized.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new Error(`${field}: Dieses Datum existiert nicht.`);
  return normalized;
}

function identifier(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Eine Personenkennung ist ungültig.');
  return value;
}

function references(value, field, max) {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${field}: ungültige Anzahl an Beziehungen.`);
  const ids = value.map(identifier);
  if (new Set(ids).size !== ids.length) throw new Error(`${field}: Eine Beziehung ist doppelt eingetragen.`);
  return ids;
}

function normalizePerson(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Ein Personeneintrag ist ungültig.');
  const person = { id: identifier(input.id) };
  for (const field of PERSON_FIELDS) {
    const value = input[field] ?? '';
    person[field] = field.endsWith('Date') ? date(value, field === 'birthDate' ? 'Geburtsdatum' : 'Sterbedatum') : text(value, field, ['notes', 'sources'].includes(field) ? 20000 : 500);
  }
  if (!person.firstName && !person.lastName) throw new Error('Bitte mindestens einen Vor- oder Nachnamen angeben.');
  if (person.birthDate && person.deathDate) {
    // Compare only precision shared by both dates; approximate years must remain usable.
    const precision = Math.min(person.birthDate.length, person.deathDate.length);
    if (person.birthDate.slice(0, precision) > person.deathDate.slice(0, precision)) throw new Error('Das Sterbedatum liegt vor dem Geburtsdatum.');
  }
  person.parentIds = references(input.parentIds ?? [], 'Eltern', 2);
  person.partnerIds = references(input.partnerIds ?? [], 'Partnerschaften', MAX_PEOPLE - 1);
  return person;
}

export function createTree(title = 'Meine Familie') {
  return { version: 1, title: text(title, 'Titel', 200) || 'Meine Familie', people: [] };
}

export function createPerson(fields = {}) {
  const person = { id: fields.id ?? globalThis.crypto.randomUUID() };
  for (const field of PERSON_FIELDS) person[field] = fields[field] ?? '';
  person.parentIds = [...(fields.parentIds ?? [])];
  person.partnerIds = [...(fields.partnerIds ?? [])];
  return person;
}

/** Import data is explicitly projected, never merged into live application objects. */
export function validateTree(input) {
  if (!input || typeof input !== 'object' || input.version !== 1) throw new Error('Diese Datei hat kein unterstütztes Stammbaumformat (Version 1).');
  if (!Array.isArray(input.people) || input.people.length > MAX_PEOPLE) throw new Error(`Ein Stammbaum darf höchstens ${MAX_PEOPLE} Personen enthalten.`);
  const tree = { version: 1, title: text(input.title, 'Titel', 200) || 'Meine Familie', people: input.people.map(normalizePerson) };
  const byId = new Map(tree.people.map(person => [person.id, person]));
  if (byId.size !== tree.people.length) throw new Error('Personenkennungen müssen eindeutig sein.');
  for (const person of tree.people) {
    for (const id of [...person.parentIds, ...person.partnerIds]) {
      if (id === person.id) throw new Error('Eine Person kann keine Beziehung mit sich selbst haben.');
      if (!byId.has(id)) throw new Error('Eine Beziehung verweist auf eine unbekannte Person.');
    }
    for (const id of person.partnerIds) {
      if (!byId.get(id).partnerIds.includes(person.id)) throw new Error('Eine Partnerschaft muss auf beiden Seiten eingetragen sein.');
    }
  }
  generationLevels(tree);
  return tree;
}

/** Kahn traversal avoids recursion limits even for large imported pedigrees. */
function generationLevels(tree) {
  const pendingParents = new Map();
  const children = new Map(tree.people.map(person => [person.id, []]));
  const levels = new Map(tree.people.map(person => [person.id, 0]));
  const queue = [];
  for (const person of tree.people) {
    pendingParents.set(person.id, person.parentIds.length);
    if (!person.parentIds.length) queue.push(person.id);
    for (const id of person.parentIds) children.get(id).push(person.id);
  }
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const childId of children.get(id)) {
      levels.set(childId, Math.max(levels.get(childId), levels.get(id) + 1));
      pendingParents.set(childId, pendingParents.get(childId) - 1);
      if (pendingParents.get(childId) === 0) queue.push(childId);
    }
  }
  if (queue.length !== tree.people.length) throw new Error('Diese Elternbeziehung erzeugt einen Kreis im Stammbaum.');
  return levels;
}

export function upsertPerson(tree, input) {
  const current = validateTree(tree);
  const person = normalizePerson(input);
  const exists = current.people.some(entry => entry.id === person.id);
  const people = current.people.filter(entry => entry.id !== person.id).map(entry => {
    const partnerIds = entry.partnerIds.filter(id => id !== person.id);
    if (person.partnerIds.includes(entry.id)) partnerIds.push(person.id);
    return { ...entry, partnerIds };
  });
  // Preserve the entry's position so editing does not reshuffle the person's list.
  const position = exists ? current.people.findIndex(entry => entry.id === person.id) : people.length;
  people.splice(position, 0, person);
  return validateTree({ ...current, people });
}

/** Return one complete change; callers persist only the final, validated tree. */
export function addRelative(tree, input, relativeId, relationship) {
  const current = validateTree(tree);
  const person = normalizePerson(input);
  const relative = current.people.find(entry => entry.id === relativeId);
  if (!relative) throw new Error('Die Bezugsperson ist nicht mehr vorhanden.');
  if (current.people.some(entry => entry.id === person.id)) throw new Error('Die neue Person ist bereits vorhanden.');
  if (!['parent', 'partner', 'child'].includes(relationship)) throw new Error('Unbekannte Verbindungsart.');
  if (relationship === 'parent' && relative.parentIds.length >= 2) throw new Error('Es sind bereits zwei Eltern eingetragen.');
  if (relationship === 'child') person.parentIds = [...new Set([...person.parentIds, relativeId])];
  if (relationship === 'partner') person.partnerIds = [...new Set([...person.partnerIds, relativeId])];
  const next = upsertPerson(current, person);
  const updatedRelative = next.people.find(entry => entry.id === relativeId);
  return relationship === 'parent'
    ? upsertPerson(next, { ...updatedRelative, parentIds: [...updatedRelative.parentIds, person.id] })
    : next;
}

export function deletePerson(tree, id) {
  const current = validateTree(tree);
  return { ...current, people: current.people.filter(person => person.id !== id).map(person => ({
    ...person,
    parentIds: person.parentIds.filter(parentId => parentId !== id),
    partnerIds: person.partnerIds.filter(partnerId => partnerId !== id),
  })) };
}

export function displayName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unbenannte Person';
}

export function getGenerations(tree) {
  const levels = displayGenerationLevels(tree);
  const groups = [];
  for (const person of tree.people) (groups[levels.get(person.id)] ??= []).push(person);
  return groups.map(group => group.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'de')));
}

/** Unknown ancestry may follow a partner, without recording invented parents. */
function displayGenerationLevels(tree) {
  generationLevels(tree); // Ancestry cycles remain invalid, independently of layout.
  const byId = new Map(tree.people.map(person => [person.id, person]));
  const groupOf = new Map();
  const groups = [];
  for (const person of tree.people) {
    if (groupOf.has(person.id)) continue;
    const group = [person.id];
    groupOf.set(person.id, groups.length);
    // Parentless partners form one display group; recorded ancestry stays separate.
    for (let i = 0; i < group.length; i++) {
      const member = byId.get(group[i]);
      if (member.parentIds.length) continue;
      for (const id of member.partnerIds) if (!byId.get(id).parentIds.length && !groupOf.has(id)) {
        groupOf.set(id, groups.length);
        group.push(id);
      }
    }
    groups.push(group);
  }
  const edges = [];
  for (const person of tree.people) {
    const target = groupOf.get(person.id);
    for (const id of person.parentIds) edges.push({ source: groupOf.get(id), target, distance: 1 });
    if (!person.parentIds.length) for (const id of person.partnerIds) {
      if (byId.get(id).parentIds.length) edges.push({ source: groupOf.get(id), target, distance: 0 });
    }
  }
  const traverse = omittedTargets => {
    const pending = groups.map(() => 0);
    const outgoing = groups.map(() => []);
    const levels = groups.map(() => 0);
    for (const edge of edges) {
      if (edge.distance === 0 && omittedTargets.has(edge.target)) continue;
      pending[edge.target]++;
      outgoing[edge.source].push(edge);
    }
    const queue = groups.map((_, index) => index).filter(index => pending[index] === 0);
    for (let i = 0; i < queue.length; i++) for (const edge of outgoing[queue[i]]) {
      levels[edge.target] = Math.max(levels[edge.target], levels[edge.source] + edge.distance);
      if (--pending[edge.target] === 0) queue.push(edge.target);
    }
    return { levels, unresolved: new Set(groups.map((_, index) => index).filter(index => pending[index] > 0)) };
  };
  let result = traverse(new Set());
  // Conflicting partner hints must never turn a valid pedigree into a layout cycle.
  // Fall back to ancestry for the affected groups, including downstream groups.
  if (result.unresolved.size) result = traverse(result.unresolved);
  return new Map(tree.people.map(person => [person.id, result.levels[groupOf.get(person.id)]]));
}

/** Suggestions are optional choices, never automatically recorded parentage. */
export function getParentSuggestions(tree, selectedParentIds, excludedId) {
  if (selectedParentIds.length !== 1) return [];
  const selected = tree.people.find(person => person.id === selectedParentIds[0]);
  if (!selected) return [];
  const generation = getGenerations(tree).find(group => group.some(person => person.id === selected.id));
  const sameGeneration = new Set(generation.map(person => person.id));
  const partners = new Set(selected.partnerIds);
  return tree.people.filter(person => person.id !== excludedId && !selectedParentIds.includes(person.id)
    && (partners.has(person.id) || sameGeneration.has(person.id)))
    .sort((a, b) => Number(partners.has(b.id)) - Number(partners.has(a.id))
      || displayName(a).localeCompare(displayName(b), 'de') || a.id.localeCompare(b.id));
}

/** Order the tree by families without changing ancestry levels or stored data. */
export function getTreeGenerations(tree) {
  const generations = getGenerations(tree);
  const compareNames = (a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'de') || a.id.localeCompare(b.id);
  const compareSiblings = (a, b) => {
    if (a.birthDate && b.birthDate && a.birthDate !== b.birthDate) return a.birthDate.localeCompare(b.birthDate);
    if (Boolean(a.birthDate) !== Boolean(b.birthDate)) return a.birthDate ? -1 : 1;
    return compareNames(a, b);
  };
  // Co-parents belong together even when no partnership was recorded.
  const relatives = new Map(tree.people.map(person => [person.id, new Set(person.partnerIds)]));
  for (const child of tree.people) if (child.parentIds.length === 2) {
    const [a, b] = child.parentIds;
    relatives.get(a).add(b);
    relatives.get(b).add(a);
  }
  const positions = new Map();
  return generations.map(generation => {
    // Keep siblings with the same recorded parents as one indivisible block.
    const byParents = new Map();
    for (const person of generation) {
      const key = person.parentIds.length ? JSON.stringify([...person.parentIds].sort()) : `person:${person.id}`;
      if (!byParents.has(key)) byParents.set(key, []);
      byParents.get(key).push(person);
    }
    const blocks = [...byParents.values()].map(people => {
      people.sort(compareSiblings);
      const parentPositions = people[0].parentIds.map(id => positions.get(id));
      return { people, anchor: parentPositions.length ? parentPositions.reduce((sum, x) => sum + x, 0) / parentPositions.length : Infinity };
    });
    const blockOf = new Map(blocks.flatMap(block => block.people.map(person => [person.id, block])));
    const neighbors = new Map(blocks.map(block => [block, new Set()]));
    for (const person of generation) for (const id of relatives.get(person.id)) {
      const other = blockOf.get(id);
      if (other && other !== blockOf.get(person.id)) neighbors.get(blockOf.get(person.id)).add(other);
    }
    const compareBlocks = (a, b) => (a.anchor === b.anchor ? 0 : a.anchor - b.anchor) || compareNames(a.people[0], b.people[0]);
    const visited = new Set();
    const families = [];
    for (const block of blocks) {
      if (visited.has(block)) continue;
      const family = [block];
      visited.add(block);
      for (let i = 0; i < family.length; i++) for (const other of neighbors.get(family[i])) {
        if (!visited.has(other)) { visited.add(other); family.push(other); }
      }
      family.sort(compareBlocks);
      const anchors = family.map(member => member.anchor).filter(Number.isFinite);
      families.push({ blocks: family, anchor: anchors.length ? anchors.reduce((sum, x) => sum + x, 0) / anchors.length : Infinity });
    }
    families.sort((a, b) => (a.anchor === b.anchor ? 0 : a.anchor - b.anchor) || compareNames(a.blocks[0].people[0], b.blocks[0].people[0]));
    const ordered = families.flatMap(family => family.blocks.flatMap(block => block.people));
    ordered.forEach((person, index) => positions.set(person.id, (index + 0.5) / ordered.length));
    return ordered;
  });
}

export function demoTree() {
  return validateTree({ version: 1, title: 'Familie Linden', people: [
    createPerson({ id: 'otto', firstName: 'Otto', lastName: 'Linden', birthDate: '1932-04-18', birthPlace: 'Freiburg', deathDate: '2015', partnerIds: ['martha'], notes: 'Fiktives Beispiel: liebte seinen Garten und lange Spaziergänge.' }),
    createPerson({ id: 'martha', firstName: 'Martha', lastName: 'Linden', birthName: 'Sommer', birthDate: '1936-08-09', birthPlace: 'Heidelberg', partnerIds: ['otto'] }),
    createPerson({ id: 'paul', firstName: 'Paul', lastName: 'Linden', birthDate: '1961-03-12', birthPlace: 'Freiburg', parentIds: ['otto', 'martha'], partnerIds: ['clara'] }),
    createPerson({ id: 'clara', firstName: 'Clara', lastName: 'Linden', birthName: 'Berg', birthDate: '1964-06-23', birthPlace: 'Bonn', partnerIds: ['paul'] }),
    createPerson({ id: 'johanna', firstName: 'Johanna', lastName: 'Linden', birthDate: '1966-11-02', parentIds: ['otto', 'martha'] }),
    createPerson({ id: 'anna', firstName: 'Anna', lastName: 'Linden', birthDate: '1992-09-15', birthPlace: 'München', parentIds: ['paul', 'clara'] }),
    createPerson({ id: 'felix', firstName: 'Felix', lastName: 'Linden', birthDate: '1995-01-30', birthPlace: 'München', parentIds: ['paul', 'clara'] }),
  ] });
}
