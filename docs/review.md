# Umsetzungs- und Prüfnotiz

## Einzelpartner zwischen Geschwistergruppen einordnen (9. November 2026)

Die vorherige Korrektur bewertete nur zwei Richtungen einer gesamten Partnerschaftskette. Sie deckte den gemeldeten Fall mit rechts stehender C-Gruppe nicht ab. Einzelkarten mit genau einem benachbarten Geschwisterblock werden nun vor der Kettensortierung abgetrennt und anschließend an dessen passenden Rand angefügt. Die Position ihrer Partnerperson innerhalb der unveränderten Geburtsfolge bestimmt die nähere Seite. Bei genau mittiger Partnerposition entscheidet die Ankerreihenfolge. Mehrere Beziehungen zum selben Block werden über den mittleren Partnerindex bewertet. Mehrere Einzelpartner am selben Rand stehen deterministisch nach Partnerindex und Namen; Partner einer Randperson stehen näher am Block. Karten mit mehreren benachbarten Blöcken und reine Einzelpaare bleiben in der bisherigen Kettensortierung. Deren Richtung verwendet wieder die Blockränge statt globaler Partnerdistanzen.

Die erweiterte Fallmatrix prüft beide Altersreihenfolgen, bekannte/unbekannte Eltern von A, C an beiden Geschwisterrändern und verschiedene Elternanker. Für D älter als B und die rechte C-Gruppe wird ausdrücklich `[D, B, A, C-Gruppe]` erwartet. Der Vergleich mit einem Baum ohne A prüft zusätzlich die unveränderte Reihenfolge der Kernblöcke in diesen Fällen. Zwei neue Tests prüfen ein verzweigtes Partnerschaftsnetz und mehrere konkurrierende Einzelpartner auf beiden Seiten. Der unabhängige Review fand zunächst eine falsche Reihenfolge mehrerer rechter Einzelpartner; diese wurde behoben und durch den neuen Verhaltenstest abgesichert. Der abschließende Review meldete keine Blocker. Zusätzlich prüfte der Agent 1.000 gültige fiktive 30-Personen-Graphen auf deterministische Eingabeumkehrung, unveränderte Generationen und Datenerhalt.

Chrome Headless bestätigte mit elf fiktiven Personen die konkrete Reihenfolge `[D, B, A, C, Cs Geschwister]` auf Bildschirm und im Druck. Fokussierbare Karten, 390 Pixel ohne Seitenüberbreite, eine A4-PDF-Seite und unveränderter localStorage nach dem Druckzyklus wurden geprüft. Die emulierte Druckaufnahme wurde visuell geprüft. Prüfdateien bleiben in `.local/`; keine PDF-Rasterprüfung, kein physischer Ausdruck, keine vollständige Tastatur-/Screenreaderprüfung und keine anderen Browser geprüft.

`npm.cmd run check` bestand mit 65 Tests, Syntaxprüfungen und Build; `git diff --check` ohne Formatfehler. Mehrere Partner derselben Randperson können nicht alle direkt angrenzen. Personen in der Mitte eines Geschwisterblocks bleiben dort; bestehende Eltern-/Kinderanker können weiterhin Kernzweige umordnen.

## Einzelpartner am passenden Ende des Geschwisterblocks (9. November 2026)

Einfache Partnerschaftsketten vergleichen jetzt beide Richtungen anhand der tatsächlichen Personenabstände. Vorrang haben Beziehungen mit mindestens einem Einzelkartenblock, danach sämtliche Partner-/Co-Eltern-Abstände und schließlich die bisherigen Ankerkosten. Ganze Blöcke wechseln die Seite; Geschwister behalten ihre Geburtsfolge. Im geschilderten Fall steht deshalb Cs Geschwistergruppe vor D und B, gefolgt von Bs Partnerin A. Längere Verbindungen zwischen Geschwisterblöcken werden dafür bewusst in Kauf genommen. Verzweigte Partnerschaftsnetze erhalten keine globale Optimierung.

Die neue Fallmatrix prüft beide Altersreihenfolgen von B und D, C an beiden Enden seines Geschwisterblocks, A mit und ohne bekannte Eltern, gemeinsame Eltern ohne eingetragene Partnerschaft, umgekehrte Eingaben, unveränderte Generationen und Datenerhalt. Ein vorhandener Test für nachgeführte Elternzweige erwartet nun ebenfalls die näher stehende Partnerperson. Der unabhängige Review bestätigte die einmalige Zählung jeder Beziehung und die ganzzahligen Kosten ohne blockierende Befunde. Zusätzlich prüfte er 1.000 generierte validierte 30-Personen-Bäume auf deterministische Eingabeumkehrung, Generationszugehörigkeit und Datenerhalt.

Chrome Headless mit isoliertem Profil und elf fiktiven Personen bestätigte die Reihenfolge `[C, Cs Geschwister, D, B, A]` auf Bildschirm und im Druck, fokussierbare Karten, keine Seitenüberbreite bei 390 Pixeln, eine A4-PDF-Seite und unveränderten localStorage nach dem Druckzyklus. Die emulierte Druckaufnahme wurde visuell geprüft. Keine PDF-Rasterprüfung, kein physischer Ausdruck, keine vollständige Tastatur-/Screenreaderprüfung und keine anderen Browser geprüft. Prüfdateien bleiben im ignorierten `.local/`.

`npm.cmd run check` bestand abschließend mit 63 Tests, Syntaxprüfungen und statischem Build; `git diff --check` ohne Formatfehler.

## Personen für den Druck ausblenden (9. November 2026)

Eine durchsuchbare Checkboxliste steuert gemeinsam Baumdruck, Chronikvorschau und HTML-Dokument. Alle ein-/ausblenden, Abbrechen, Auswahlzähler und Wiederherstellen sind möglich. Die Auswahl gilt für die Sitzung; erfolgreiche Sicherungsimporte, neue Bäume und Beispieldaten setzen sie zurück. Die reine Ausgabeprojektion in `src/domain.js` entfernt ausgeblendete Personen und ihre Beziehungsreferenzen. Originaldaten, Bearbeitungsansicht und Sicherungen bleiben vollständig. Es entstehen keine Ersatzbeziehungen; die Ausgabe berechnet Generationen neu und kennzeichnet sich als Auszug. Freitexte bleiben unverändert.

Unabhängiger Engineering-/Datenerhalt-Review: 25 Report-/Speichertests und 100 zusätzliche deterministische fiktive 30-Personen-Bäume mit sechs Ausgabekombinationen bestanden. Gefunden und behoben wurden ein fehlendes Zurücksetzen beim Sicherungsimport und ein falsches Trennzeichen im Dialog. Der Reviewer bestätigte beide Korrekturen; keine offenen Reviewbefunde. Er führte keine eigene Browserprüfung aus.

Ausgeführt: `npm.cmd run check`, 62 Tests erfolgreich, Syntaxprüfung und statischer Build bestanden. Der neue Verhaltenstest prüft ausgeblendete Eltern/Partner, nur ein sichtbares Kind, alle/keine ausgeblendeten Personen, unbekannte IDs, gültige projizierte Referenzen, maskierte Namen, Verzeichnisse, Labels, Einseitenoption und Datenerhalt in allen drei Ausgabewegen.

Chrome Headless mit getrenntem Profil und 20 fiktiven Personen: Checkbox per Leertaste, Fokuswiederherstellung, 20 unveränderte Bildschirmkarten gegenüber 19 Druckkarten/Chronikeinträgen, alle aus-/einblenden, Abbrechen und unveränderter localStorage geprüft. Echte A4-PDF erzeugt; mobile Ansicht bei 390 Pixeln ohne Seitenüberbreite. Mobile Dialogaufnahme und emulierte Druckaufnahme visuell geprüft. Die Browserprüfung benötigte Ausführung außerhalb der Sandbox, da Chrome darin keine DevTools-Befehle beantwortete. Prüfdateien bleiben unter ignoriertem `.local/`.

Grenzen: Keine Rasterprüfung der PDF, kein physischer Ausdruck, kein Screenreader, keine anderen Browser; A3 und sehr große Auswahllisten nicht erneut im Browser geprüft. Die Auswahl wird nicht dauerhaft gespeichert. Freitexte sind keine automatische Anonymisierung.

## Mehr Baumfläche auf großen Monitoren (8. November 2026)

Die Baumansicht nutzt die verfügbare Breite ohne das bisherige Maximum von 1780 Pixeln; ihre maximale Scrollhöhe wächst mit hohen Fenstern. „Baum vergrößern“ blendet Navigation, Kopfbereich, Statistik und Fußzeile aus. Ab 1151 Pixeln stehen Baum und separat scrollbar bleibende Details in der verfügbaren Fensterhöhe. Auf schmalen Bildschirmen bleibt der Arbeitsbereich im normalen Seitenfluss. Die Umschaltung hält nur Sitzungszustand und schreibt keine Familiendaten.

Eigene technische und visuelle Prüfung in Chrome Headless mit isoliertem Profil und 96 fiktiven Personen über acht Generationen: Bei 2560 × 1440 Pixeln wächst die sichtbare Baumfläche von 1838 × 1020 auf 2163 × 1104 Pixel. Geprüft wurden Umschalten per Enter, Rückkehr per Escape mit Fokus auf der Schaltfläche, Erhalt der Scrollposition beim Umschalten, Auswahl und Personendetails, Suche mit erreichbarer Rückkehrschaltfläche sowie Escape im Personendialog ohne Verlassen der großen Ansicht. Bei 390 × 844 Pixeln entstand in beiden Modi kein horizontaler Seitenüberlauf; Desktop- und Mobilaufnahmen wurden visuell geprüft. Die Druckausgabe ließ sich auch aus der großen Ansicht als PDF erzeugen und kehrte anschließend in diese Ansicht zurück. Der gespeicherte Stammbaum blieb bytegleich. Prüfdateien liegen ausschließlich unter dem ignorierten `.local/`.

`npm.cmd run check` bestand mit 54 Tests, Syntaxprüfungen und statischem Build; `git diff --check` bestand. Prüfgrenzen: keine Rasterprüfung der PDF, kein physischer Ausdruck, keine anderen Browser oder Screenreader. Kein unabhängiger Agentenreview für diese kleine Oberflächenänderung. Die Vergrößerung ist eine Ansicht innerhalb des Browserfensters; Zoom und ausblendbare Personendetails sind nicht Bestandteil dieser Änderung.


## Optionale Labels (8. November 2026)

Labels sind pro Person als begrenzte Textliste erfasst und werden bei Import und Speicherung ausdrücklich projiziert. Alte Dateien erhalten eine leere Liste. Die Ausgabe auf Karten, in der Chronik, beim Baumdruck und beim HTML-Download ist standardmäßig deaktiviert. Lange Drucklabels erscheinen vollständig in einem automatischen Anhang. JSON-Sicherungen behalten sämtliche Labels unabhängig von der Ausgabeoption.

Ein unabhängiger Review-Agent prüfte Validierung, Legacy-Daten, Optionsdurchreichung, Datenerhalt und HTML-Maskierung ohne blockierende Befunde. Er führte 49 Fach-, Speicher- und Ausgabetests erfolgreich aus; ein eigener Browserreview war nicht Teil seiner Prüfung. Drei neue Verhaltenstests prüfen Bearbeitung/Entfernung, ungültige Labelwerte, Speicherfehler, Sicherungsrundlauf, optionale maskierte Ausgabe und vollständige Druckanhänge.

Die technische Leitung prüfte Chrome Headless mit einem eigenen lokalen Profil und ausschließlich fiktiven Daten: Bearbeiten/Speichern/Neuladen, Tab-Reihenfolge zum Biografiefeld, Fokus nach Umschalten der Ausgabeoption, Chronik mit und ohne Labels, 20 lange Labels ohne Seitenüberbreite bei 390 Pixeln sowie deren verlustfreies erneutes Bearbeiten. Der kurze Druckfall mit Spitzname, Vornamen, Geburtsjahr und zwei Labels ergab eine A4-Seite ohne SVG-Textüberlauf und ohne Änderung der gespeicherten Daten. Bildschirm und emulierte Druckansicht wurden visuell geprüft; vollständige lange Labels im Anhang wurden im DOM geprüft. Prüfdateien liegen ausschließlich im ignorierten lokalen Arbeitsverzeichnis.

Abschließend bestand `npm.cmd run check` mit 53 Tests, Syntaxprüfungen und statischem Build; `git diff --check` meldete keine Formatfehler.

Prüfgrenzen: Keine Rasterprüfung der PDF selbst, kein physischer Ausdruck, keine anderen Browser oder Screenreader. Die Ausgabeoption wird nur für die laufende Sitzung gehalten. Freie Labels werden weder automatisch gedeutet noch als historische Aussagen ergänzt.

## Spitznamen (8. November 2026)

Das optionale, auf 500 Zeichen begrenzte Feld `nickname` wird ausdrücklich validiert und projiziert. Alte Version-1-Daten ohne das Feld bleiben lesbar. Der Spitzname ersetzt die Hauptanzeige der Vornamen; die echten Vornamen bleiben in Speicherung und Sicherung erhalten und stehen auf Karten, in Details, Verzeichnissen und Chronik kleiner separat. Beziehungen verwenden den bevorzugten Anzeigenamen. Ein leerer Spitzname stellt die bisherige Anzeige wieder her. Ohne erfasste Vornamen wird keine zusätzliche Namenszeile erfunden.

Ein unabhängiger Agent prüfte Datenerhalt, Kompatibilität, Maskierung und Druckcode. Sein Suchbefund wurde behoben: Hauptsuche, Auswahlzählung und Elternsuche berücksichtigen neben dem Spitznamen auch den vollständigen echten Namen. Die abschließende Lesekontrolle bestätigte die Korrektur ohne weitere blockierende Befunde.

Die technische Leitung prüfte in einem eigenen Chrome-Headless-Profil mit ausschließlich fiktiven Daten Bearbeiten, Speichern, Neuladen und Entfernen, Suche nach beiden vollständigen Namen, kleinere separate Vornamen, Tab-Reihenfolge zum Spitznamenfeld, Dialog und Seitenbreite bei 390 Pixeln sowie die Chronikanzeige. Mobile Ansicht und emulierte Druckansicht wurden visuell geprüft. Eine Baum-PDF hatte eine Seite; der Druckzyklus veränderte keine gespeicherten Daten. 100 Zeichen Spitzname und 500 Zeichen Vornamen erzeugten keinen SVG-Textüberlauf.

Zwei zusätzliche automatisierte Verhaltenstests prüfen Altformat, Speicher-/JSON-Rundlauf, Ablehnung ungültiger Spitznamen ohne Überschreiben, Entfernen, Beibehaltung sämtlicher Vornamen, HTML-/SVG-Maskierung und fehlende Vornamen. `npm.cmd run check` bestand mit 50 Tests, Syntaxprüfungen und Build; `git diff --check` ohne Formatfehler.

Prüfgrenzen: Nur Chrome, kein Screenreader, kein physischer Ausdruck und keine Rasterprüfung der PDF selbst. Sehr lange Vornamen werden auf Baumdruckkarten mit … gekürzt; vollständig stehen sie im SVG-Titel und optionalen Verzeichnis. Browserprofil, PDF, Bilder und Prüfskript bleiben im ignorierten lokalen Arbeitsverzeichnis.

## Geburtsfolge der Geschwister hat Vorrang (8. November 2026)

Auf Nutzerwunsch bleibt innerhalb jedes Geschwisterblocks die Reihenfolge nach bekanntem Geburtsdatum erhalten, auch bei Partnerschaften und gemeinsamen Kindern. Die Verschiebung einzelner Geschwister an Blockränder entfällt. Die Anordnung ganzer Familienzweige in beiden Richtungen bleibt erhalten. Fehlende Geburtsdaten stehen weiterhin nach bekannten Daten; Namen und IDs lösen Gleichstände auf.

Die beiden betroffenen Verhaltenstests prüfen jetzt den Vorrang der Geburtsfolge bei blockübergreifenden Partnerschaften, gemeinsamen Kindern und Partnern auf beiden Seiten. `npm.cmd run check` bestand mit 48 Tests, Syntaxprüfungen und Build; `git diff --check` ohne Formatfehler. Keine erneute Browser- oder unabhängige Agentenprüfung für diese kleine Folgeänderung. Die folgenden Browser- und Reviewnachweise beschreiben den vorherigen Stand mit Randverschiebung; die dort genannten Prüfgrenzen gelten weiter.

## Kartenreihenfolge über mehrere Generationen (8. November 2026)

Die Sortierung führt Elternzweige anhand der Kinderreihenfolge nach. Geschwister mit identischen Eltern bleiben zusammen; Partnerschaften und gemeinsame Eltern können einzelne Geschwister an den zugewandten Blockrand verschieben. Unbeteiligte Geschwister behalten ihre relative Geburts-/Namensreihenfolge. Einfache Partnerschaftsketten ordnen die beteiligten Blöcke nebeneinander an. Drei begrenzte Auf-/Abwärtsdurchläufe vermeiden unbeschränkte Optimierungsschleifen. Bildschirm und Baumdruck verwenden weiterhin dieselbe Reihenfolge.

Ein unabhängiger Review-Agent prüfte den Ansatz und die Umsetzung. Sein Zufallstest fand einen Determinismusfehler durch Rundung normalisierter Anker. Ganzzahlige Kartenränge beheben ihn. Danach prüfte der Agent 2.000 validierte fiktive Bäume mit je 24 Personen und umgekehrter Personen-, Eltern- und Partnerreihenfolge ohne weitere blockierende Befunde. Drei neue Regressionstests decken drei Elternpaare mit verbundenen Geschwisterblöcken und gemeinsamen Kindern, Partner an beiden Blockrändern sowie gleiche Anker bei permutierten Eingaben ab. Bestehende Tests prüfen weiterhin Patchwork, Datenerhalt und Generationszugehörigkeit.

Chrome Headless prüfte einen fiktiven 15-Personen-Baum: identische Reihenfolge auf Bildschirm und im Druck, fokussierbare Karten, keine Seitenüberbreite bei 390 Pixeln, unveränderter localStorage nach dem Druckzyklus und genau eine PDF-Seite. Bildschirmaufnahme und emulierte Druckansicht wurden visuell geprüft. Prüfdateien liegen ausschließlich im ignorierten lokalen Arbeitsverzeichnis. Keine Rasterprüfung der PDF selbst, kein physischer Ausdruck und keine vollständige Tastatur-/Screenreaderprüfung. Exakte geometrische Zentrierung, ein globales Kreuzungsminimum und sämtliche Nachbarschaftswünsche bei Mehrfachpartnerschaften sind nicht garantiert; kein Browserlasttest mit 5.000 Personen.

Abschließend bestand `npm.cmd run check` mit 48 Tests, Syntaxprüfungen und statischem Build; `git diff --check` ohne Formatfehler.

## Rollen aus Generationen vorschlagen (8. November 2026)

Die technische Leitung ergänzte eine reine Vorschlagsfunktion: Bei genau zwei benachbarten dargestellten Generationen wird die obere als Eltern und die untere als Kinder vorbelegt, sofern die gesamte Änderung gültig ist. Manuelle Änderungen und ausdrückliches Speichern bleiben möglich. Zwei neue Fachtests prüfen Auswahlreihenfolge, Partnergenerationen, Datenerhalt, mehrdeutige Auswahlen, Generationssprünge und Elternlimit. `npm.cmd run check` bestand mit 45 Tests und Build.

Chrome Headless im isolierten Testprofil mit fiktiven Beispieldaten bestätigte die vorbelegten Rollen, deren Änderbarkeit, unveränderte Speicherung vor Bestätigung und die korrekten Elternverbindungen nach Bestätigung. Dieselbe Generation, ein Generationssprung und ein überschrittenes Elternlimit ließen die Rollen offen; keine Laufzeitfehler beobachtet. Keine zusätzliche unabhängige Agentenprüfung für diese kleine Folgeänderung. Bestehende Grenzen für echte Touchgeräte, Screenreader und andere Browser gelten weiter. Generationen sind lediglich Vorschlagshilfe und kein Beleg einer Verwandtschaft.

## Mehrfachauswahl und Verknüpfung vorhandener Personen (8. November 2026)

Ein Engineering-Agent ergänzte die reine Fachfunktion für eine Partnerschaft zwischen zwei vorhandenen Personen sowie die gemeinsame Verknüpfung von einem oder zwei Elternteilen mit mehreren Kindern. Vier neue Tests prüfen Beziehungserhalt, Wiederholung ohne Duplikate, vollständige Ablehnung bei Elternlimit oder Kreis sowie ungültige Kennungen und Rollen. Die technische Leitung integrierte Karten-/Listenauswahl mit Strg/⌘, Shift-Bereich und einem Mehrfachauswahl-Modus für Touch und Tastatur. Eltern- und Kindrollen werden ausdrücklich im Dialog vergeben; ausgefilterte Auswahlen bleiben sichtbar gezählt.

Derselbe Agent prüfte die UI-Integration anschließend per Codeinspektion. Gefundene beschädigte Sonderzeichen wurden korrigiert und die empfohlene Fokuswiederherstellung nach Dialogabschluss ergänzt. Die technische Leitung prüfte die Fachintegration und führte die Browserabläufe unabhängig von der Implementierung der Fachfunktion aus.

Chrome Headless mit eigenem Testprofil und fünf fiktiven Personen bestand Strg-/Meta-Umschalten, Shift-Bereich, einfache Auswahl, Partnerschaft, zwei Eltern für zwei Kinder, Speicherfehler mit unveränderten Daten und erhaltenen Rollen sowie erfolgreichen Wiederholungsversuch. Eine kreisbildende Elternverbindung wurde ohne Datenänderung abgewiesen. Native Leertastenaktivierung und Fokus, Auswahl ohne Zusatztasten, ausgefilterte Auswahlen einschließlich Namensanzeige im Bestätigungsdialog, Seiten-/Dialogbreite bei 390 Pixeln und Druckvorbereitung ohne Auswahlleiste wurden geprüft. Ein Screenshot des mobilen Rollendialogs wurde visuell geprüft. Die Druckvorbereitung enthielt trotz Suche alle fünf Personen und änderte den Speicher nicht. Keine JavaScript-Laufzeitfehler beobachtet. Die CLI scheiterte im Sandboxkonto an `uv_os_get_passwd`; die Prüfung erfolgte anschließend direkt über das lokale Chrome-DevTools-Protokoll. Testprofil, Skript und Screenshot bleiben im ignorierten Arbeitsverzeichnis.

`npm.cmd run check` bestand mit 43 Tests, Syntaxprüfung und statischem Build. Prüfgrenzen: keine echten Touchgeräte, keine Screenreader, keine anderen Browser, kein Lasttest großer Auswahlen und kein physischer Ausdruck. Die Linienhervorhebung folgt weiterhin einer Fokusperson, die Kartenmarkierung der gesamten Auswahl.

## Partnerschaften ohne bekannte Eltern und direkte Verwandtenanlage (8. November 2026)

Ein Engineering-Agent ergänzte Generationen für elternlose Partner, die vollständig validierte Anlage von Eltern, Partnern und Kindern sowie unverbindliche Vorschläge für den zweiten Elternteil. Die technische Leitung integrierte direkte Aktionen in den Personendetails, feste Bezugspersonen im Formular und eine Elternsuche, die ausgewählte Einträge erhält. Es werden keine Vorfahren oder Datumsangaben erfunden. Die Generationsregel gilt für Bildschirm, Chronik und Baumdruck.

Ein unabhängiger Review-Agent führte `npm.cmd run check` aus und prüfte zusätzlich 1.200 reproduzierbare gemischte Eltern-/Partnergraphen auf Vollständigkeit, stabile Reihenfolge, Elternvorrang und unveränderte Eingaben. Speicherfehler wurden für alle drei Arten der Verwandtenanlage geprüft. Sein Befund, dass die Bezugsperson abwählbar war und beim Speichern erneut hinzugefügt wurde, wurde durch feste Kontextcheckboxen behoben und erneut geprüft; keine weiteren blockierenden Befunde.

Die technische Leitung prüfte mit ausschließlich fiktiven Daten in einem eigenen Chrome-Headless-Profil: neue Partnerperson ohne Eltern in Generation 3, HTML-Maskierung, feste Kontextverbindungen, Partnervorschlag beim Kindanlegen, Auswahl des zweiten Elternteils, Erhalt ausgewählter Eltern trotz Suchfilter, Tab-Navigation und Fokus nach Auswahl, beide direkten Elternanlagen und ausgeblendete Elternaktion bei zwei Eltern. Ein erzwungener Speicherfehler erhielt Bestand und Formulareingaben; erneutes Speichern stellte die Verbindung vollständig her. Bei 390 Pixeln gab es keine Seitenüberbreite; Formular und Vorschlagsbereich wurden visuell geprüft. Ein A4-Baum-PDF wurde erzeugt, die vollständige Kartenanzahl in der Druckausgabe geprüft. Keine JavaScript-Laufzeitfehler. Die DevTools-CLI scheiterte an `uv_os_get_passwd`; die Browserprüfung erfolgte direkt über das lokale DevTools-Protokoll. Prüfdateien verbleiben unter dem ignorierten `.local/`.

Prüfgrenzen: Keine vollständige Barrierefreiheitsprüfung, keine anderen Browser oder physische Drucker. Die PDF wurde nicht seitenweise gerastert und visuell geprüft. Bei widersprüchlichen Partnerhinweisen verwendet die Darstellung für betroffene und nachgelagerte Gruppen nur Elternbeziehungen; bei unterschiedlich tief erfassten Eltern bleiben Partner gegebenenfalls getrennt. Die Generationszuordnung ist eine Darstellungshilfe, kein Nachweis unbekannter Abstammung. Lasttests der neuen interaktiven Vorschläge mit 5.000 Personen stehen aus.

Stand: 7. November 2026. Ausschließlich fiktive Beispieldaten.

## Architektur und lokale Datenverarbeitung

Die Umsetzung trennt fachliche Regeln von Darstellung und Speicherung und dokumentiert nachvollziehbare Prüfungen. Es gelten ausschließlich die Verträge dieser lokalen Anwendung.

Die Anwendung verwendet native JavaScript-Module ohne externe Pakete. Der lokale Node.js-Server liefert ausschließlich ausdrücklich freigegebene Programmdateien. Er lauscht auf der Loopback-Adresse, lehnt fremde Host-Header ab und bietet keine Daten-API. Die Content Security Policy sperrt Netzwerkverbindungen aus der Anwendung; keine Analyse-, Konto- oder Cloud-Dienste wurden eingerichtet.

Personen und Beziehungen liegen im Browserprofil. Der JSON-Import projiziert die erlaubten Felder, prüft Kennungen und Referenzen und weist Elternkreise ab. Darstellung und Chronik maskieren Benutzereingaben für HTML. Das Speichern prüft Änderungen des Browserbestands durch andere Fenster und meldet erkannte Konflikte.

Es gibt keine Verschlüsselung und keine Zugriffstrennung für Personen mit Zugriff auf dasselbe Rechner- oder Browserprofil. JSON-Sicherungen und HTML-Chroniken enthalten die erfassten Angaben im Klartext. Die Anwendung schützt nicht vor einem kompromittierten Betriebssystem, Browserprofil oder Browser-Erweiterungen. Das Löschen von Browserdaten kann den gesamten lokalen Bestand entfernen.

## Tatsächlich ausgeführte Teamarbeit

- Ein Fachregel-Agent implementierte das Datenmodell und Tests für Import, Beziehungen, Datumsprüfung und Löschung.
- Ein Gestaltungs-Agent erstellte die Gestaltung für Bildschirm, schmale Ansichten und Druck.
- Ein Runtime-Agent implementierte Server und Build sowie HTTP-Tests. Derselbe Agent las die integrierte Oberfläche, Speicherung, Chronik und Fachregeln für einen zusätzlichen Sicherheits- und Ablaufreview.
- Die technische Leitung integriert die Beiträge und verantwortet die abschließende Prüfung.

Der zusätzliche Review fand insbesondere das Risiko, dass eine spätere Rücknahme einer Löschung zwischenzeitliche Änderungen überschreiben könnte, eine missverständliche Lebensstatus-Anzeige bei fehlendem Sterbedatum sowie auf kleinen Bildschirmen verborgene Sicherungsaktionen. Alle drei Befunde wurden korrigiert und im Browser geprüft. Ein weiterer Review des Fachregel-Agenten prüfte Speicherung und Dokumentausgabe und ergänzte deren Fehlerfalltests. Rollenbezeichnungen sind kein Nachweis einer unabhängigen Datenschutz- oder Sicherheitszertifizierung.

## Nachgewiesene automatisierte Prüfung

Der Runtime-Agent führte `node --test tests/server.test.js` erfolgreich aus: zwei Tests prüfen MIME-Typen, HEAD-Anfragen und Sicherheitsheader sowie die Abweisung nicht freigegebener Projektdateien, kodierter Pfade, fremder Hostnamen und unerlaubter HTTP-Methoden. Die Testserver wurden danach beendet.

Die technische Leitung führte `npm.cmd run check` erfolgreich aus: Syntaxprüfung, 18 Tests und statischer Build. Fachliche Fälle umfassen verlustfreien JSON-Rundlauf, Elternkreise, ungültige Referenzen, Partnerschaftsänderungen, Beziehungserhalt nach Löschung und historische Datumsangaben. Weitere Tests prüfen Speicherfehler ohne Verlust des bisherigen Bestands, erneutes Speichern, veraltete Fensterstände, beschädigten oder gesperrten Speicher, HTML-Maskierung und sämtliche Beziehungsreferenzen in der Chronik.

Die technische Leitung prüfte die Anwendung außerdem mit Chrome DevTools CLI 1.12.0 in einer isolierten Chrome-Instanz mit ausschließlich fiktiven Daten. Werkzeug-Telemetrie und CrUX-Abfragen wurden für die Prüfung deaktiviert. 18 Browser-Ablaufprüfungen bestanden: leere Startansicht, Person anlegen, HTML als Text anzeigen, Kind verbinden, SVG-Verbindung, Elternkreis abweisen, löschen, rückgängig machen, Rücknahme nach späteren Änderungen deaktivieren, JSON-Backupinhalt, Chronikinhalt, eigenständiges HTML, neuer Baum nach Bestätigung, Wiederherstellung über Dateieingabe, leere Suche, Druckansicht vorbereiten, Ausgangsansicht nach Druck wiederherstellen und ausschließlich lokale Ressourcen.

Zusätzlich bestanden vier Prüfungen zur Wiederherstellung aus beschädigten Browserdaten sowie zwei zum Schutz ungespeicherter Formulare. Desktop-Screenshot (1440 Pixel) und Smartphone-Emulation (390 Pixel) wurden visuell geprüft. Die Smartphone-Prüfung bestätigte erreichbare Sicherungsaktionen und keine horizontale Überbreite der gesamten Seite. Der Beispielbaum zeigte sieben Karten und acht Eltern-Kind-Verbindungen. Die Browserkonsole zeigte keine Fehler.

## Grenzen der Prüfung

Geprüft wurde die Vorbereitung der Druckansicht, nicht die tatsächliche PDF-Paginierung oder ein physischer Ausdruck. Der Review belegt keine Installation auf anderen Rechnern, keine vollständige Barrierefreiheitsprüfung und keine Prüfung aller Browser. Für große reale Stammbäume liegen keine Belastungstests vor. Die dokumentierte Höchstzahl für den Import ist keine Zusage zur flüssigen Darstellung jeder Baumstruktur. Die Prüfung veralteter Fensterstände über localStorage ist keine atomare Transaktion; exakt gleichzeitige Schreibvorgänge in mehreren Fenstern können kollidieren. Deshalb nur ein Bearbeitungsfenster verwenden.

Es wurden keine realen Familiendaten verarbeitet, keine Cloud-Ressourcen provisioniert und keine Daten veröffentlicht. Der Dokumentexport gibt alle erfassten Angaben aus; eine Redaktion oder automatische Filterung vertraulicher Notizen findet nicht statt.

## Erweiterung Baumdruck (8. November 2026)

Ein unabhängiger Review-Agent prüfte Druckarchitektur, Datenerhalt, Maskierung und Skalierung. Seine Befunde zu überbreiten Namen und quadratischer Vervielfachung langer Elternlinien wurden behoben: Namen haben eine begrenzte SVG-Textbreite, vollständige Namen stehen im Verzeichnis; Linien werden nur auf Blättern ihrer Endpunkte ausgegeben. Blattübergreifende Beziehungen werden über Personennummern zugeordnet.

`npm.cmd run check` bestand mit 22 Tests und statischem Build. Vier neue Tests prüfen mehrseitige breite und tiefe Bäume, vollständige Beziehungsreferenzen, unveränderte Eingabedaten, leere Bäume, lange Namen, HTML-Maskierung, unbekannte Lebensdaten und begrenzte Linienvervielfachung.

Die technische Leitung prüfte den fiktiven Beispielbaum in einem eigenen lokalen Chrome-Headless-Profil per DevTools-Protokoll. Die erzeugte PDF hatte drei Seiten (zwei Baumblätter und ein Verzeichnis). Geprüft wurden die vollständige Ausgabe aller sieben Personen trotz aktiver Suche, identisches App-Markup und identischer localStorage nach dem Druckzyklus, Entfernung der Druckausgabe, unveränderte Chronikauswahl sowie keine Seitenüberbreite bei 390 Pixeln. Eine Bildschirmaufnahme der emulierten Druckansicht wurde visuell geprüft. PDF und Aufnahme bleiben lokale Prüfarbeitsdateien und werden nicht eingecheckt.

Prüfgrenzen: Kein physischer Ausdruck, kein interaktiver Druckabbruch und keine anderen Browser geprüft. Die PDF-Seitenzahl wurde geprüft, die PDF selbst nicht Seite für Seite gerastert und visuell geprüft. Die SVG-Druckansicht wurde visuell geprüft. Sehr große Bäume können weiterhin viele Blätter erzeugen; die flüssige Browserdarstellung von 5.000 Personen ist nicht nachgewiesen. Diese neue Prüfung ergänzt die ältere, oben beschriebene Druckprüfung.

## Familienreihenfolge und gebündelte Linien

Ein unabhängiger Engineering-Agent implementierte und testete die Familienreihenfolge in der Fachschicht. Ein weiterer Agent prüfte den Ansatz unabhängig und empfahl gemeinsame Elternanschlüsse, Geschwisterleisten, getrennte Spuren und Referenzen für generationenüberspringende Beziehungen. Die technische Leitung integrierte das gemeinsame Geometriemodul für Bildschirm und Druck. Die Chronik behält ihre alphabetische Reihenfolge; fachliche Generationshöhen bleiben unverändert.

Vier neue Fachtests prüfen den geschilderten Fall zweier Elternpaare mit alphabetisch vermischten Kindern, Patchwork, stabile Reihenfolge ohne Datenänderung, Geburtsreihenfolge und Partnerschaften. Zwei Geometrietests prüfen getrennte Familien, gemeinsame Geschwisterlinien, Verzweigungen im freien Zwischenraum, Auswahlhervorhebung und Vermeidung langer Linien durch fremde Karten. Der Server-Test prüft die Auslieferung des lokalen Geometriemoduls.

In Chrome Headless wurde eine ausschließlich fiktive Familie mit zwei Elternpaaren und fünf Kindern geprüft: vier Geschwister stehen zusammen links, das Kind des rechten Paars rechts. Zwei getrennte Familienverbindungen und die Hervorhebung nach Personenauswahl wurden geprüft. Ein Desktop-Screenshot wurde visuell geprüft, bei 390 Pixeln gab es keine Seitenüberbreite. Bei vielen Mehrfachpartnerschaften ist Kreuzungsfreiheit weiterhin nicht garantiert; Kreuzungen erhalten keine zusätzlichen Verzweigungspunkte.

## Kompakter Baumdruck mit 32 Kartenplätzen

Die technische Leitung implementierte acht Karten je Generation und vier Generationen je Blatt. Das Verzeichnis ist standardmäßig deaktiviert und über eine beschriftete Checkbox optional. Die Ausgabe verwendet dieselbe Familienreihenfolge und Liniengeometrie wie die Oberfläche. Sichtbare Liniensegmente werden auf Blattgrenzen begrenzt; Karten werden vollständig einem Blatt zugeordnet. Bei mehr als acht Personen in einer Generation entstehen zusätzliche Blätter, auch bei insgesamt weniger als 32 Personen.

Der unabhängige Review-Agent fand zunächst zu kleine Schrift und die Wiederholung unsichtbarer Anschlüsse bei breiten Geschwisterfamilien. Beide Befunde wurden korrigiert und durch denselben Agenten erneut geprüft: Die Namen sind jetzt ungefähr 8,4 pt groß. Sein gemessener fiktiver 1.000-Personen-Baum erzeugte nach der Korrektur 2.252 Pfade und 657.169 HTML-Zeichen statt 250.750 Pfaden und 7,97 Mio. Zeichen. Es wurden keine weiteren blockierenden Befunde berichtet.

Neue Tests prüfen genau ein Baumblatt für 32 Personen mit acht Personen in jeder von vier Generationen, das optionale vollständige Verzeichnis, den Fortsetzungsfall mit einer neunten Person in einer Generation ohne geteilte oder fehlende Karten sowie begrenzte Ausgabegröße bei 999 Geschwistern. Bestehende Tests wurden an die kompaktere Paginierung und Familienreihenfolge angepasst.

In Chrome Headless wurde eine echte PDF für diese fiktiven 32 Personen erzeugt: genau eine Seite, MediaBox 841,92 × 594,96 pt (A4 quer). Mit aktiviertem Verzeichnis waren es zwei Seiten. Die emulierte Druckansicht wurde visuell geprüft. Suche beeinflusste den ausgegebenen Gesamtbaum nicht. Identisches App-Markup, unveränderter localStorage, erhaltene Scrollposition und wiederhergestellter Tastaturfokus nach dem Druckzyklus wurden geprüft; ebenso Chronikauswahl und fehlende Seitenüberbreite bei 390 Pixeln. Ein 200 Zeichen langer Titel und ein 500 Zeichen langer Name erzeugten ebenfalls genau eine Baumseite; SVG-Textmessungen zeigten keinen Textüberlauf aus den Karten. Die PDF-Seitenzahl und das Papierformat wurden geprüft; keine Rasterprüfung der PDF-Datei und kein physischer Ausdruck. Alle Prüfdateien und das Chrome-Testprofil bleiben im ignorierten lokalen Arbeitsverzeichnis.

Abschließend bestand `npm.cmd run check` mit 31 Tests, Syntaxprüfungen und statischem Build; `git diff --check` meldete keine Formatfehler.

## Ruhigere Gestaltung des Baumdrucks

Die technische Leitung überarbeitete die Karten mit weichen Rundungen, blassen Salbeitönen und einer durchgängigen lokalen Systemschrift. Titel-Laufweite und SVG-Schrift erben keine abweichende Georgia-/Arial-Gestaltung mehr. Namen behalten ihre natürliche Laufweite; nur tatsächlich zu breite SVG-Zeilen werden nach unsichtbarer Layoutmessung auf die Kartenbreite begrenzt. Karten enthalten ausschließlich Namen und bekannte Lebensdaten. Personennummern, Elterntexte und Platzhalter für vollständig unbekannte Lebensdaten entfallen.

Damit durch den Verzicht auf Personennummern keine Beziehungen verloren gehen, ergänzt die Ausgabe bei Verbindungen über Blatt- oder Generationsgrenzen automatisch einen Namensanhang. Blatt, Generation und Kartenposition von links machen dort auch gleichnamige Personen eindeutig. Bei aktiviertem vollständigem Verzeichnis übernimmt dieses die Zuordnung. Ein unabhängiger Agent prüfte die Änderung vorab und abschließend ohne blockierende Befunde; seine Empfehlung zur Unterscheidung gleicher Namen wurde umgesetzt.

`npm.cmd run check` bestand mit 33 Tests und Build, `git diff --check` ohne Formatfehler. Die zusätzlichen Verhaltenstests prüfen reduzierte Karten mit bekannten Geburts-/Sterbedaten sowie den automatischen Anhang bei gleichnamigen Personen und übersprungenen Generationen. Bestehende Tests prüfen weiterhin Datenerhalt, Maskierung, sämtliche Beziehungsangaben, Paginierung und breite Familien.

Chrome Headless erzeugte für 32 fiktive Personen in vier Generationen weiterhin genau eine A4-Querformatseite, einschließlich eines Beispiels mit zwölf vollständig fehlenden Lebensdaten. Die emulierte Druckansicht wurde visuell geprüft. Die berechneten Schriftfamilien von Titel, Namen und Lebensdaten waren identisch; kurze Namen enthielten keine Laufweitenanpassung. Ein 500 Zeichen langer Name und ein 200 Zeichen langer Titel passten ohne Kartenüberlauf ebenfalls auf eine Baumseite. Das optionale vollständige Verzeichnis ergab in diesem Prüfbeispiel insgesamt drei Seiten. Suche, Scrollposition, Tastaturfokus, unveränderter localStorage, mobile Seitenbreite und Chronikauswahl wurden erneut geprüft. Keine Rasterprüfung der PDF selbst, kein physischer Ausdruck und keine Prüfung anderer Browser. Prüfdateien bleiben im ignorierten lokalen Arbeitsverzeichnis.

## Deutsche Datumseingabe und Speichern oben (8. November 2026)

Geburts- und Sterbedaten akzeptieren zusätzlich TT.MM.JJJJ. Die Fachregeln normalisieren vollständige Angaben vor Kalender- und Chronologieprüfung nach JJJJ-MM-TT; bisherige Teilangaben und Sicherungen bleiben kompatibel. Die Aktionen des Personenformulars stehen vor den Eingabefeldern und bleiben beim Scrollen oben sichtbar.

`npm.cmd run check` bestand mit 54 Tests, Syntaxprüfungen und Build. Der neue Verhaltenstest prüft Normalisierung, JSON-Rundlauf, Schaltjahre, ungültige Kalenderdaten, gemischte Datumsformate bei der Chronologie und unveränderte Eingabedaten. `git diff --check` bestand ebenfalls.

Chrome Headless mit isoliertem Profil und ausschließlich fiktiven Daten bestätigte Datumseingabe, Speichern per Enter, Erhalt nach Neuladen, sichtbare Fehlermeldungen und unveränderten Speicher bei ungültigem Datum sowie simuliertem Schreibfehler. Bei 390 Pixeln Breite blieb die Speichern-Schaltfläche nach Scrollen zum Formularende sichtbar und bedienbar, ohne horizontale Seitenüberbreite; der Screenshot wurde visuell geprüft. Eine PDF der fiktiven Einzelperson enthielt weiterhin genau eine A4-Querformatseite; der Dialog war im Druck ausgeblendet. Prüfdateien bleiben unter dem ignorierten `.local/`.

Prüfgrenzen: keine vollständige Barrierefreiheitsprüfung, keine weiteren Browser und kein physischer Ausdruck. Die Datumseingabe wird beim erneuten Bearbeiten weiterhin im gespeicherten ISO-Format angezeigt; TT.MM.JJJJ wird zusätzlich als Eingabe akzeptiert. Für diese kleine Änderung wurde kein unabhängiger Agentenreview durchgeführt.

## Gesamten Baum auf eine Seite drucken (8. November 2026)

Die technische Leitung ergänzte eine optionale Einseitenausgabe und die Papierauswahl A4/A3 quer. Das Einseitenraster enthält alle Generationen und Personen; eine feste Blatthöhe mit flexiblem SVG skaliert die Baumgrafik in den verfügbaren Raum. Der bisherige Standard mit acht Karten je Generation und vier Generationen je Blatt bleibt erhalten. Einstellungen gelten nur für die Sitzung und ändern keine Familiendaten. Der sichtbare Hinweis erklärt kleine Schrift und mögliche zusätzliche Anhangseiten. Übersprungene Elternbeziehungen, lange Labels und das optionale Verzeichnis bleiben vollständig nachvollziehbar.

Ein unabhängiger Engineering-Agent prüfte Code und neue Tests ohne blockierende Befunde. Seine Hinweise zur Erhaltung automatischer Anhänge und zur zusätzlichen Prüfung des mehrseitigen A3-Drucks wurden berücksichtigt. Er führte selbst keine Browserprüfung aus.

`npm.cmd run check` bestand mit 56 Tests, Syntaxprüfungen und statischem Build. Zwei neue Verhaltenstests prüfen zehn Personen in jeder von sechs Generationen, sämtliche Karten auf einem Baumblatt, A4/A3, optionales Verzeichnis, unveränderte Daten, Maskierung, leere Bäume und vollständige Anhänge für lange Labels und übersprungene Generationen. Die vorhandenen Tests für mehrseitigen Druck bestehen unverändert.

Chrome Headless mit getrenntem Testprofil und ausschließlich fiktiven Daten erzeugte echte PDFs: 40 Personen (zehn je Generation) auf genau einer A4- beziehungsweise A3-Querformatseite; 60 Personen in sechs Generationen auf einer A4-Seite; 96 Personen in sechs Generationen mit 200 Zeichen langem Titel und 500 Zeichen langem Namen auf jeweils einer A4/A3-Seite. Derselbe 40-Personen-Baum erzeugte ohne Einseitenoption auf A4 und A3 jeweils zwei Baumseiten. Mit Verzeichnis waren es im A4-Einseitenmodus drei Seiten insgesamt; das Beispiel mit übersprungener Elternbeziehung und langem Label ergab eine Baumseite plus eine Anhangseite. Eine einzelne Person und ein leerer Baum ergaben jeweils eine sinnvolle Druckseite. PDF-Seitenzahlen und MediaBox-Papiermaße wurden geprüft.

Tastaturumschaltung der Checkbox, Erhalt der Papierauswahl nach Suchänderung, Ausgabe aller Personen trotz Suchfilter, unveränderte gespeicherte Daten und Bildschirminhalte, Fokuswiederherstellung sowie die weiterhin getrennte Chronikausgabe wurden geprüft. Bei 390 Pixeln gab es keine horizontale Seitenüberbreite. Screenshots der emulierten Druckansicht und der mobilen Oberfläche wurden visuell geprüft. Keine Rasterprüfung der PDF selbst, kein physischer Ausdruck, keine weiteren Browser und kein Screenreader-Test. Sehr große Bäume können auf einer Seite unleserlich klein werden. Prüfdateien bleiben im ignorierten `.local/`.

## Gerundete Familienlinien und getrennte Spuren

Die Liniengeometrie verwendet quadratische Kurven mit bis zu 8 px Radius an echten Richtungswechseln. Gerade Anschlüsse und Verzweigungen bleiben verbunden; Punkte erscheinen nur an tatsächlichen Abzweigungen. Bildschirm-Zwischenräume wachsen mit der Anzahl unterschiedlicher Familienverbindungen und ermöglichen 12 px Abstand zwischen waagerechten Spuren. Der Druck übernimmt die Rundungen und begrenzt Kurven auf das jeweilige Blatt. Druck-Zwischenräume wachsen begrenzt mit; jedes Baumblatt wird einschließlich Kopf und Legende in den verfügbaren A4-/A3-Höhenrahmen eingepasst.

Ein unabhängiger Engineering-Agent prüfte Geometrie und Druckintegration. Er fand zwei Druckprobleme: Größenregeln erfassten auch verschachtelte SVGs, und zusätzliche Zwischenräume konnten den A4-Höhenrahmen überschreiten. Beide wurden behoben und unabhängig erneut im Code geprüft. Eine anschließend gemeldete Skalierungsgrenze bei generationenweit sehr vielen Familien wurde durch begrenzte Druck-Zwischenräume korrigiert und mit einem fiktiven 400-Personen-Baum automatisiert abgesichert.

Ausgeführt: `npm.cmd run check` mit 59 erfolgreichen Tests einschließlich Syntaxprüfung und statischem Build. Neue Geometrieprüfungen decken echte Kurven, gerade Einzelverbindungen, Geschwisterverzweigungen, 16 getrennte Familienspuren, erhaltene Kartenanschlüsse und Begrenzung an Blattkanten ab. Reporttests prüfen zusätzlich alle 400 Karten auf 13 Blättern bei begrenzter Blatthöhe. Chrome Headless prüfte einen fiktiven 15-Personen-Baum mit Kurven sowie vier Generationen mit je acht Einzel-Elternlinien: Reihenfolge, Tastaturfokus, 390 px ohne horizontale Seitenüberbreite, unveränderten localStorage und je eine A4-PDF-Seite im normalen und im Einseitenmodus. Bildschirm- und emulierte Druckaufnahmen wurden visuell geprüft. Prüfdateien liegen ausschließlich im ignorierten `.local/`. Die DevTools-CLI scheiterte an einem lokalen Laufzeitfehler; die Browserprüfung lief über das bereits vorhandene lokale DevTools-Protokoll-Prüfskript.

Prüfgrenzen und Restschulden: Kein physischer Ausdruck, keine Rasterprüfung der PDF-Seiten, kein Screenreader und keine weiteren Browser. A3 wurde in dieser Änderung nicht erneut im Browser geprüft. Bei vielen Familien werden Druckspuren enger als am Bildschirm; automatische Kreuzungsfreiheit und ein kreuzungsoptimiertes Routing bleiben offen. Sehr große Einseitenbäume können weiterhin kleine Schrift ergeben. Ein visueller 5.000-Personen-Test wurde nicht durchgeführt.

## Getrennte senkrechte Familienlinien

Der Folgefehler waren deckungsgleiche senkrechte Strecken unterschiedlicher Familien: Gleiche Elternmittelpunkte oder ein Mittelpunkt auf einem fremden Kartenanschluss ließen getrennte Beziehungen wie eine gemeinsame Verbindung aussehen. Die Geometrie reserviert jetzt je Generationszwischenraum eigene senkrechte Stammspalten und hält möglichst 12 px Abstand zu fremden Kartenanschlüssen und Stämmen. Gemeinsame Eltern erhalten je Familienverbindung leicht versetzte Anschlüsse innerhalb ihrer Karte. Eigene gerade Verbindungen bleiben erhalten. Bei verschobenen Stämmen wird die obere Sammellinie mit verlängert, sodass alle Anschlüsse verbunden bleiben. Die Änderung gilt über das gemeinsame Geometriemodul auch für den Druck.

Ein unabhängiger Engineering-Agent reproduzierte den Überlagerungsfehler, prüfte anschließend die Implementierung und führte 30 Geometrie-/Reporttests sowie 100 zusätzliche fiktive Zufallslayouts aus. Er fand dabei keine deckungsgleichen fremden Vertikalen oder unterbrochenen Familienverbindungen und keine blockierenden Befunde. Sein Geometrielauf mit 5.000 fiktiven Personen dauerte ungefähr 558 ms; dies ist kein Nachweis der vollständigen Browserleistung.

Ausgeführt: `npm.cmd run check`, 61 Tests erfolgreich einschließlich Syntaxprüfung und Build. Regressionstests prüfen verschachtelte Elternpaare mit gleichem Mittelpunkt, fremde Kartenstiele, getrennte Anschlüsse gemeinsamer Eltern, geometrische Erreichbarkeit aller Liniensegmente einschließlich Kurven, unveränderte Routen bei Personenauswahl und unveränderte Eingabedaten. Eine lokale Chrome-Headless-Prüfung mit 20 fiktiven Personen und mehreren überlappenden Elternbeziehungen fand keine deckungsgleichen fremden senkrechten Linien in der Bildschirmgeometrie. Geprüft wurden außerdem alle Personen im Druck, Tastaturfokus, 390 px ohne horizontale Seitenüberbreite, unveränderter localStorage, zwei A4-Baumblätter mit einer Anschlussliste sowie ein vollständiges A4-Baumblatt im Einseitenmodus. Bildschirm- und emulierte Einseiten-Druckaufnahme wurden visuell geprüft; Prüfdateien bleiben im ignorierten `.local/`.

Prüfgrenzen und Restschulden: Der konkrete Nutzerbaum wurde nicht eingelesen; das Screenshot-Muster wurde mit fiktiven Geometrien nachgestellt. Keine physische Druckprüfung, keine Rasterprüfung der PDFs, kein Screenreader und keine weiteren Browser. A3 wurde nicht erneut im Browser geprüft. Bei extrem dicht belegten Kartenanschlüssen wird der Spaltenabstand reduziert. Horizontale/senkrechte Kreuzungen bleiben möglich und werden weiterhin mit einem hellen Abstand kenntlich gemacht; insgesamt kreuzungsfreie Linienführung wird nicht garantiert.
