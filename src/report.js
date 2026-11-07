import { displayName, getGenerations } from './domain.js';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export function formatDate(value) {
  if (!value) return 'unbekannt';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : parts.length === 2 ? `${parts[1]}.${parts[0]}` : value;
}
export function lifespan(person) {
  const birth = person.birthDate?.slice(0, 4);
  const death = person.deathDate?.slice(0, 4);
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `geb. ${birth}`;
  if (death) return `gest. ${death}`;
  return 'Lebensdaten offen';
}
export function reportMarkup(tree) {
  const people = getGenerations(tree).flat();
  const numbers = new Map(people.map((person, index) => [person.id, index + 1]));
  const names = ids => ids.map(id => {
    const person = people.find(p => p.id === id);
    return `${escapeHtml(displayName(person))} <span class="report-reference">[${numbers.get(id)}]</span>`;
  }).join(', ');
  return `<article class="report" aria-label="Familienchronik">
    <header class="report-cover"><p class="eyebrow">WURZELWERK · FAMILIENCHRONIK</p><h1>${escapeHtml(tree.title)}</h1><p>Menschen, Verbindungen und Erinnerungen.</p><p>${people.length} Personen · Erstellt am ${new Date().toLocaleDateString('de-DE')}</p></header>
    <section class="report-index"><h2>Personenverzeichnis</h2><p>Die Nummern verbinden die Einträge mit ihren Angehörigen. Unbekannte Angaben bleiben offen.</p><ol>${people.map(person => `<li><a href="#report-${numbers.get(person.id)}">${escapeHtml(displayName(person))}</a> <span>${escapeHtml(lifespan(person))}</span></li>`).join('')}</ol></section>
    ${getGenerations(tree).map((generation, index) => `<section class="report-family"><h2>Generation ${index + 1}</h2>${generation.map(person => `<section class="report-person" id="report-${numbers.get(person.id)}"><h3><span>${numbers.get(person.id)}.</span> ${escapeHtml(displayName(person))}</h3>
      ${person.birthName ? `<p>Geburtsname: ${escapeHtml(person.birthName)}</p>` : ''}
      <p>Geboren: ${escapeHtml(formatDate(person.birthDate))}${person.birthPlace ? ` in ${escapeHtml(person.birthPlace)}` : ''}</p>
      ${person.deathDate || person.deathPlace ? `<p>Gestorben: ${escapeHtml(formatDate(person.deathDate))}${person.deathPlace ? ` in ${escapeHtml(person.deathPlace)}` : ''}</p>` : ''}
      <p>Eltern: ${names(person.parentIds) || 'nicht erfasst'}</p>
      ${person.partnerIds.length ? `<p>Partnerschaften: ${names(person.partnerIds)}</p>` : ''}
      ${people.some(p => p.parentIds.includes(person.id)) ? `<p>Kinder: ${names(people.filter(p => p.parentIds.includes(person.id)).map(p => p.id))}</p>` : ''}
      ${person.notes ? `<h4>Erinnerungen & Biografie</h4><p class="preserve-lines">${escapeHtml(person.notes)}</p>` : ''}
      ${person.sources ? `<h4>Quellen</h4><p class="preserve-lines">${escapeHtml(person.sources)}</p>` : ''}
    </section>`).join('')}</section>`).join('')}
    <footer>Privat erstellte Familienchronik · Angaben nach dem eigenen Forschungsstand.</footer>
  </article>`;
}

export function reportDocument(tree) {
  return `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(tree.title)}</title><style>body{font:11pt/1.6 Georgia,serif;color:#233d32;max-width:180mm;margin:20mm auto;padding:0 12mm}h1{font-size:34pt}h2{border-bottom:1px solid #bac8bd;padding-bottom:8px}h3{font-size:17pt}h4,p{margin:6px 0}.report-cover{padding:30mm 0;break-after:page}.report-index{break-after:page}a{color:inherit}.report-person{break-inside:avoid;margin-bottom:25px}.preserve-lines{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:20mm;font-size:9pt}.report-reference{font-size:9pt}@page{size:A4;margin:18mm}@media print{body{margin:0;padding:0}h2{break-after:avoid}}</style>${reportMarkup(tree)}</html>`;
}
