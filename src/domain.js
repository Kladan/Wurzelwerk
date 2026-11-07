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
  const levels = generationLevels(tree);
  const groups = [];
  for (const person of tree.people) (groups[levels.get(person.id)] ??= []).push(person);
  return groups.map(group => group.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'de')));
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
