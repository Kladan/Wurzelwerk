# Umsetzungs- und Prüfnotiz

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
