# MemoraBet Firebase Modular

Versión modular de MemoraBet con Firebase Authentication y Realtime Database.

## Archivos principales

- `index.html`: estructura del juego.
- `style.css`: diseño visual.
- `firebase-config.js`: configuración de Firebase.
- `auth.js`: registro, login, logout y recuperación de perfiles.
- `database.js`: operaciones con Realtime Database.
- `game.js`: lógica del juego.
- `ui.js`: renderizado de interfaz.
- `state.js`: estado compartido del juego y sesión.
- `constants.js`: constantes del juego.
- `utils.js`: funciones auxiliares.
- `main.js`: punto de entrada.

## Cómo probar

Usa Live Server en VS Code. No abrir con doble clic.

Debe verse algo como:

```txt
http://127.0.0.1:5500/index.html
```

## Notas

Si una cuenta existe en Authentication pero no tiene perfil en Realtime Database, el juego reconstruye automáticamente el perfil con un nickname basado en el correo.

## Corrección de perfiles incompletos

Esta versión incluye un modo de reparación: si Firebase Authentication tiene una cuenta, pero falta el perfil en Realtime Database, el juego no inventa el nickname desde el correo. En vez de eso, pide un nickname y crea el perfil faltante.

## Ejecutar localmente

Usa Live Server en VS Code. No abras `index.html` con doble clic.

