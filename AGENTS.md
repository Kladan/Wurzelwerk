# Wurzelwerk

Lokale Stammbaum-Anwendung. Die Fachrollen umfassen technische Leitung/Integration, Software Engineering und Architektur, Datenschutz/Security sowie UX und Gestaltung. Nur tatsächlich ausgeführte Reviews dokumentieren. Bei größeren Aufgaben passende unabhängige Agenten einbeziehen.

- Keine Cloud, Telemetrie, externen Fonts oder CDN-Ressourcen hinzufügen. Laufzeit bleibt ohne externe Pakete.
- Nur fiktive Beispieldaten; keine Stammbäume, Sicherungen, personenbezogenen Screenshots oder Zugangsdaten committen.
- Reine Fachregeln in `src/domain.js`, Speicherung in `src/storage.js`, Dokumentausgabe in `src/report.js`, Oberfläche in `src/app.js`.
- Eingelesene Daten streng validieren und ausdrücklich projizieren; Nutzereingaben vor HTML-Ausgabe maskieren. Beziehungen ohne Zyklen und ohne verwaiste Referenzen erhalten.
- Speicherfehler dürfen keinen Erfolg vortäuschen und bestehende Daten nicht überschreiben. Neue Netzwerkzugriffe oder Speicheradapter erfordern eine ausdrückliche Produktentscheidung.
- UI auf Tastaturbedienung, kleine Bildschirme und lesbaren A4-Druck prüfen. Fehlende Angaben nicht als bekannte Fakten darstellen.
- `npm run check` vor einem Implementierungscommit ausführen. Tests an beobachtbarem Verhalten, Fehlerfällen und Datenerhalt ausrichten.
- Auch in neuen Chats dürfen Agenten abgeschlossene, geprüfte Änderungen im beauftragten Umfang selbstständig in sinnvollen lokalen Commits festhalten, ohne erneut um Erlaubnis zu fragen. Fremde Änderungen nicht mitcommitten. Pushes und Veröffentlichungen benötigen einen entsprechenden Auftrag.
- Prüfgrenzen und konkrete Restschulden dokumentieren. Vorhandene fremde Änderungen bewahren, keine globale Git-Konfiguration verändern und keine geteilte Historie umschreiben.
