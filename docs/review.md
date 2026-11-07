# Umsetzungs- und Prüfnotiz

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
