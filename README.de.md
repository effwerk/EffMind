**🌐 Sprachen:**
[English](README.md) | [简体中文](README.zhs.md) | [繁體中文](README.zht.md) | [Nederlands](README.nl.md) | [Deutsch](README.de.md)

# EffMind: KI-unterstütztes Mind-Mapping-Tool

EffMind ist ein Open-Source-Mindmap-Editor, der sowohl im Web als auch in Visual Studio Code läuft. Etwa 70 % des Codes und dieser Dokumentation wurden mit Hilfe von **GitHub Copilot, ChatGPT und Google Gemini** erstellt.

> ⚠️ Hinweis: Der Code wurde von verschiedenen KI-Tools generiert, daher kann der Stil variieren. Funktionalität ist vorhanden, jedoch wurde die Code-Struktur noch nicht vollständig optimiert.

## Technologiestack

* Komponenten mit **Lit.js** gebaut ([https://lit.dev/](https://lit.dev/))
* Native Web Components
* **SVG**-Rendering für Knoten und Verbindungen
* SPA-Architektur; VSCode-Erweiterung nutzt über Webview die gleiche Frontend-Struktur
* Eingebautes Mehrsprachensystem (JSON-Wörterbücher + Laufzeitumschaltung)
* **Unterstützt dunkle/helle Themes, automatisch nach Systemeinstellung**

## Funktionen

### Mindmap-Bearbeitung

* Knoten erstellen, bearbeiten, löschen, verschieben
* Bearbeitung von Unter- und Geschwisterknoten
* Canvas verschieben und zoomen
* Automatisches Layout
* Rückgängig / Wiederherstellen
* Mini-Karte
* Knotensuche
* Rechtsklickmenüs für Knoten und Canvas

### Import / Export

* Import: `.mind` (JSON)
* Export: `.mind`, `.png`, interaktive zusammenklappbare `.svg`

### Mehrsprachigkeit

* Texte in JSON gepflegt
* Laufzeit-Sprachwechsel
* Gemeinsame Sprachkonfiguration für Web & VSCode
* Erweiterbar mit benutzerdefinierten Sprachpaketen

### Themes

* Dunkle und helle Themes
* Standardmäßig an System `prefers-color-scheme` angepasst

## Plattformunterstützung

### PWA

* Installation auf Desktop oder Mobilgerät möglich
* Offline-Unterstützung
* Getestet auf iOS 16 / iPadOS 16
* Android-Test ausstehend

### VSCode-Erweiterung

* Benutzerdefinierter Editor für `.mind`-Dateien
* Webview lädt komplette UI
* Unterstützung für Dateizuordnung