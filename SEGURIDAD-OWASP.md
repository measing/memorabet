# Seguridad MemoraBet

Cambios agregados:

- Cloud Functions para iniciar, cancelar y finalizar partidas solo.
- Cloud Function para liquidar premios online.
- App Check listo para activar con reCAPTCHA Enterprise.
- Reglas de ranking e historial cerradas para que el cliente no escriba directo.

## 1. Activar App Check

En Firebase Console:

1. App Check.
2. Registrar app web.
3. Elegir reCAPTCHA Enterprise.
4. Copiar la site key.
5. Pegarla en `app-check-config.js`.

No actives "Enforce" hasta subir la web con esa clave funcionando.

## 2. Desplegar Functions

```bat
npm.cmd install --prefix functions
firebase deploy --only functions
```

## 3. Publicar reglas

```bat
firebase deploy --only database
```

## 4. Validar

- Crear cuenta nueva.
- Jugar modo solo con cuenta.
- Completar partida y revisar ranking/historial.
- Probar salir al comienzo y confirmar reembolso.
- Jugar duelo online y revisar que el premio se liquide una sola vez.

## Pendientes de seguridad fuerte

Todavia conviene migrar tienda y salas online completas a Cloud Functions si quieres anti-trampa mas fuerte. Este cambio ya mueve ranking/historial/premios principales al servidor, pero una app cliente nunca debe considerarse totalmente confiable.
