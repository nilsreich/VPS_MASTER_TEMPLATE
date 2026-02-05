# @repo/todo

Das Frontend der Todo-Anwendung, entwickelt mit [Preact](https://preactjs.com/), [Vite](https://vitejs.dev/) und [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Moderne UI**: Gebaut mit Preact für hohe Performance und Tailwind CSS für ein ansprechendes Dark-Mode-Design.
- **Interaktive Todo-Liste**: Erstellen, Bearbeiten, Löschen und Umschalten des Status von Aufgaben.
- **Datei-Anhänge**: Unterstützung für das Hochladen von Begleitdateien direkt zu einem Todo.
- **Authentifizierung**: Login- und Registrierungs-System zur persönlichen Datenverwaltung.
- **Codespaces-Ready**: Automatische Erkennung der GitHub Codespaces Umgebung für die Backend-Anbindung.
- **Typensicherheit**: Vollständige Integration der gemeinsamen Schemas aus `@repo/shared`.

## Entwicklung

### Installation

```bash
bun install
```

### Konfiguration

Das Frontend verbindet sich standardmäßig mit dem Backend auf Port 3000. Dies kann über Umgebungsvariablen gesteuert werden:

- `VITE_API_URL`: Die URL zum Backend (z.B. `http://localhost:3000/api`).

In **GitHub Codespaces** wird die URL automatisch anhand des Hostnamens ermittelt, um das Port-Forwarding von Port 5173 auf Port 3000 abzubilden.

### Server starten

```bash
bun run dev
```

Die Anwendung ist im Browser unter http://localhost:5173 erreichbar.

### Build für Produktion

```bash
bun run build
```

Die statischen Dateien werden im `dist/` Verzeichnis generiert.

## Projektstruktur

- `src/App.tsx`: Die zentrale Komponente mit dem State-Management und der Benutzeroberfläche.
- `src/lib/api.ts`: API-Wrapper für die Kommunikation mit den Hono-Endpunkten des Backends.
- `src/index.css`: Tailwind CSS Direktiven und globale Stil-Anpassungen.
- `src/main.tsx`: Einstiegspunkt für die Preact-Anwendung.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
