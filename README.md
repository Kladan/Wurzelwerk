# Wurzelwerk · Dein lokaler Stammbaum

Wurzelwerk erfasst Personen, Eltern, Kinder und Partnerschaften auf dem eigenen Rechner. Aus dem Stammbaum entsteht eine lesbare Familienchronik mit Personenverzeichnis, Verweisen, Erinnerungen und Quellen. Die Anwendung benötigt kein Konto, keine Synchronisierung und keine Cloud.

## Starten

Voraussetzung: **Node.js 24 oder neuer** und ein aktueller Browser. Im Projektordner ausführen:

```sh
npm start
```

Anschließend **http://127.0.0.1:4173** im Browser öffnen. Unter Windows alternativ **Start.cmd** doppelklicken. Unter Windows/PowerShell kann bei gesperrten PowerShell-Skripten `npm.cmd start` verwendet werden. Der Server bleibt im Terminal aktiv; `Strg+C` beendet ihn. Eine Paketinstallation oder ein Build ist zum Starten nicht nötig: Es gibt keine externen Laufzeitabhängigkeiten.

Der Server lauscht ausschließlich auf `127.0.0.1`. Er liefert Programmdateien aus und empfängt oder speichert keine Familiendaten. Nach Installation von Node.js funktioniert die Anwendung ohne Internetzugang. Fonts, Skripte und Gestaltung sind lokal enthalten.

## Eine Familie erfassen

1. **Person hinzufügen** wählen und mindestens einen Vor- oder Nachnamen eintragen.
2. Weitere Personen anlegen. Beim Bearbeiten lassen sich bis zu zwei Eltern sowie Partnerschaften auswählen. In den Personendetails legen **Elternteil hinzufügen**, **Partnerschaft hinzufügen** und **Kind hinzufügen** eine neue Person direkt mit der passenden Verbindung an. Bei zwei erfassten Eltern entfällt die Elternanlage. Die Bezugsperson ist im Formular fest vorausgewählt. Für weitere Eltern gibt es eine Namenssuche; nach Auswahl eines Elternteils stehen bekannte Partner und Personen derselben Generation als unverbindliche Vorschläge oben. Ausgewählte Eltern bleiben auch beim Suchen erhalten.
3. Geburtsname, Orte, Erinnerungen und Quellen nach Bedarf ergänzen. Daten dürfen als Jahr (`1948`), Jahr und Monat (`1948-03`) oder vollständiges Datum (`1948-03-21`) erfasst werden.
4. Im Stammbaum eine Person auswählen oder im Personenverzeichnis nach Namen und Geburtsorten suchen.

Mehrere vorhandene Personen lassen sich direkt auf ihren Karten oder im Personenverzeichnis auswählen: **Strg/⌘ + Klick** schaltet einzelne Personen um, **Shift + Klick** wählt den Bereich seit der letzten Auswahl in sichtbarer Reihenfolge. **Mehrfachauswahl** erlaubt dieselbe Einzelauswahl ohne Zusatztaste, auch per Touch oder mit Tab und Enter/Leertaste. **Auswahl aufheben** leert die Auswahl. Beim Suchen und Ansichtswechsel bleiben ausgewählte Personen erhalten; die Auswahlleiste zählt auch Personen außerhalb der Ansicht.

Für **Als Paar verpartnern** genau zwei Personen auswählen und die genannten Namen bestätigen. Für **Als Eltern / Kinder verknüpfen** mindestens zwei Personen auswählen und im Dialog jeder Person ausdrücklich eine Rolle zuweisen: ein oder zwei Elternteile und mindestens ein Kind. Alle gewählten Eltern werden mit allen gewählten Kindern verbunden. Bestehende Beziehungen bleiben erhalten; gemeinsame Eltern werden dadurch nicht automatisch zu Partnern. Bei einem Elternkreis, mehr als zwei Eltern pro Kind oder einem Speicherfehler wird die gesamte Änderung abgewiesen. Eingaben im Dialog bleiben zur Korrektur oder zum erneuten Speichern erhalten.

Die Generation ergibt sich vorrangig aus den erfassten Elternbeziehungen. Ohne erfasste Eltern orientiert sich eine Person an der Generation ihrer Partner; ihre Kinder folgen darunter. So kann eine Partnerperson ohne bekannte Eltern direkt in Generation 3 stehen. Es werden keine Eltern ergänzt und keine Geburtsdaten geschätzt. Bei unterschiedlichen Partnergenerationen gilt die tiefste widerspruchsfreie Zuordnung. Bereits erfasste Eltern haben Vorrang; widersprüchliche Partnerhinweise werden für die betroffenen und nachgelagerten Gruppen ignoriert. Partner können deshalb weiterhin in verschiedenen Zeilen stehen. Innerhalb einer Generation werden Co-Eltern und Partnerschaften zusammen angeordnet; Geschwister bleiben als Familienblock beieinander und folgen der Reihenfolge ihrer Eltern. Bekannte Geburtsdaten bestimmen die Geschwisterreihenfolge. Gemeinsame Elternanschlüsse und Geschwisterleisten ersetzen einzelne überlagerte Kurven. Verzweigungspunkte markieren echte Verbindungen; beim Auswählen einer Person werden ihre Familienlinien hervorgehoben. Eltern über mehrere Generationszeilen werden auf der Karte genannt, ohne Linien durch fremde Personen zu ziehen. Elternbeziehungen dürfen keinen Kreis erzeugen. **Beispiel erkunden** lädt ausschließlich erfundene Daten.

Bei einer Auswahl aus genau zwei benachbarten dargestellten Generationen sind die Rollen bereits vorgeschlagen: oben Eltern, darunter Kinder. Der Vorschlag berücksichtigt bestehende Eltern und muss als gesamte Änderung gültig sein. Rollen bleiben änderbar; erst **Verknüpfungen speichern** übernimmt die Beziehungen. Bei derselben Generation, übersprungenen Generationen oder ungültigen Vorschlägen bleiben die Felder offen. Die dargestellte Generation allein belegt keine Verwandtschaft.

## Speichern und sichern

Erfolgreich gespeicherte Änderungen liegen im **localStorage des verwendeten Browserprofils**. Immer dasselbe Profil und dieselbe Adresse einschließlich Port verwenden: `localhost`, `127.0.0.1`, andere Ports und andere Browser haben getrennte Speicherbereiche.

**Sicherung speichern** lädt den vollständigen Stammbaum als JSON-Datei herunter. Diese Datei regelmäßig zusätzlich an einem selbst gewählten sicheren Ort aufbewahren. **Sicherung öffnen** liest eine Wurzelwerk-JSON-Datei ein; nach Bestätigung ersetzt sie den aktuellen Stammbaum. Vor **Neuer Stammbaum** oder einem Import zuerst die bisherige Familie sichern. Die Sicherungsdatei ermöglicht auch die Weitergabe an andere, die ihre eigene lokale Installation verwenden.

Browserdaten sind kein verlässliches Backup: Löschen der Website-Daten, ein entferntes Browserprofil oder privates Surfen können den Stammbaum verlieren lassen. Bei einem Lesefehler schützt die Anwendung bestehende Rohdaten vor Überschreiben und bietet deren Download an. Ungültige Sicherungen werden abgewiesen.

Bei beschädigten Browserdaten zuerst **Rohdaten sichern**, anschließend über **Sicherung öffnen** eine gültige JSON-Sicherung auswählen und das Ersetzen bestätigen. Ein weiterhin gesperrter oder voller Browserspeicher muss zunächst im Browser behoben werden. Importe sind auf 25 MB begrenzt. Bearbeite den Stammbaum in einem Fenster: Veraltete Speicherstände werden erkannt, exakt gleichzeitige Schreibvorgänge sind jedoch nicht transaktional abgesichert.

Familiendaten und Sicherungen sind **nicht verschlüsselt**. Wer Zugriff auf das Browserprofil oder die Dateien hat, kann sie lesen. Es gibt keine Benutzerkonten oder Zugriffstrennung innerhalb der Anwendung. Auch eine exportierte Chronik enthält persönliche Angaben; die Empfänger selbst auswählen.

## Als Dokument ausgeben

**Baum drucken / PDF** in der Stammbaumansicht öffnet den Browserdruck. Dort **Als PDF speichern** wählen. Der vollständige Baum wird unabhängig von Suche und Scrollposition kompakt auf A4-Querformatblätter verteilt: **acht Personen je Generation und vier Generationen je Blatt, also 32 Kartenplätze**. Namen werden mit ungefähr 8,4 Punkt gedruckt. Mehr als acht Personen in einer Generation oder mehr als vier Generationen werden auf weitere Baumblätter verteilt; Karten werden nicht geteilt. Die Familienreihenfolge und gebündelten Linien entsprechen der Bildschirmansicht. Weich gerundete Karten und einheitliche Systemschrift greifen die Gestaltung der Oberfläche auf. Die Karten zeigen Namen und vorhandene Lebensdaten, ohne Personennummern oder Elternangaben. Vollständig unbekannte Lebensdaten bleiben leer.

Standardmäßig wird nur der Baum gedruckt. Bei Beziehungen über Blatt- oder Generationsgrenzen wird automatisch eine Anschlussliste mit Namen und Kartenpositionen ergänzt, damit auch ohne Personennummern alle Elternbeziehungen nachvollziehbar bleiben. **Verzeichnis im PDF** fügt auf Wunsch stattdessen ein vollständiges Verzeichnis mit Namen, bekannten Lebensdaten, Eltern, Partnerschaften und Kartenpositionen hinzu. Lange Namen werden auf den Karten mit „…“ gekürzt; für vollständige Namen das Verzeichnis aktivieren. Orte, Biografien und Quellen stehen in der Chronik. Auch der Browser-Druckbefehl gibt außerhalb der Chronik den Baum aus. Nach dem Druckdialog bleiben Ansicht, Scrollposition und Tastaturfokus erhalten.

**Familienchronik** zeigt alle erfassten Personen mit ihren Beziehungen, Erinnerungen und Quellen. **Drucken / PDF** öffnet den Druckdialog des Browsers; dort einen Drucker oder **Als PDF speichern** wählen. Die Anwendung selbst schreibt keine PDF-Datei ohne diesen Dialog.

**Dokument herunterladen** erzeugt zusätzlich eine eigenständige HTML-Chronik. Sie lässt sich ohne laufenden Server öffnen und drucken. Sie enthält ihre Gestaltung und benötigt keine externen Ressourcen. Es werden immer alle erfassten Personen und Notizen ausgegeben; eine automatische Ausblendung lebender Personen gibt es derzeit nicht.

## Entwicklung und Weitergabe

```sh
npm test
npm run check
npm run build
```

`check` prüft die JavaScript-Syntax, führt die automatisierten Tests aus und baut die statischen Dateien. `build` legt die Anwendung unter `dist/` ab. Diese Dateien müssen über einen lokalen HTTP-Server bereitgestellt werden; die Anwendung per `file://` zu öffnen wird nicht unterstützt. Die heruntergeladene HTML-Chronik ist davon unabhängig.

Die Architektur trennt Fachregeln (`src/domain.js`), Browserspeicher (`src/storage.js`), Dokumentausgabe (`src/report.js`) und Oberfläche (`src/app.js`). Native Browsermodule und Node.js-Bordmittel halten Installation und Offline-Betrieb einfach. Eigene Familien werden als Daten erfasst; Anpassungen am Quellcode sind dafür nicht nötig.

## Aktueller Umfang

- Ein aktiver Stammbaum pro Browserprofil und Adresse; mehrere Familien über getrennte Sicherungsdateien.
- Höchstens 5.000 Personen und zwei Eltern pro Person. Keine Unterscheidung biologischer, adoptiver oder anderer Elternbeziehungen.
- Partnerschaften ohne Heiratsereignisse oder Beziehungszeiträume; keine Fotos oder Anhänge.
- Import und Export im eigenen versionierten JSON-Format; kein GEDCOM-Import.
- Keine automatische Synchronisierung, Verschlüsselung, Cloud-Sicherung oder Mehrbenutzerbearbeitung.

Ausgeführte Prüfungen und deren Grenzen stehen in [docs/review.md](docs/review.md).
