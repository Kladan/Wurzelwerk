# Konkrete Grenzen und nächste Schritte

- **Gleichzeitige Bearbeitung:** Der localStorage-Adapter erkennt einen zuvor geänderten Speicherstand. Eine atomare Prüfung und Speicherung über mehrere Fenster fehlt. Derzeit nur ein Bearbeitungsfenster verwenden. Nächster Schritt bei Bedarf: versionierte Schreibtransaktionen mit IndexedDB und gezielter Mehrfensterprüfung.
- **Große Stammbäume:** Importvalidierung ist auf 5.000 Personen begrenzt, die Oberfläche rendert alle Personen und Beziehungen. Für diese Größe gibt es keinen Leistungsnachweis. Nächster Schritt: fiktive breite und tiefe Bäume messen, danach bei Bedarf Darstellung auf einen gewählten Familienzweig begrenzen.
- **Druck:** Die Chronik und Druckumschaltung sind geprüft; reale PDF-Seitenumbrüche und Druckertreiber sind noch ungeprüft. Nächster Schritt: kurze und mehrseitige Chronik mit langen Biografien als PDF ausgeben und visuell prüfen.
