# MemoraBet - checklist para Google Play Console

Ultima actualizacion: 6 de agosto de 2026.

## Estado tecnico

- Paquete Android: `com.memorabet.app`
- Nombre de app: `MemoraBet`
- Firebase Android: configurado con `android/app/google-services.json`
- Google Login Android: usa plugin nativo `@capacitor-firebase/authentication`
- Realtime Database: reglas cerradas para rankings/historial directos
- Cloud Functions: preparadas para partidas seguras, liquidacion online y eliminacion de cuenta
- AAB release: pendiente de generar con `generar-aab-release.bat`

## URLs para Play Console

- Politica de privacidad: `https://memorabet.site/privacidad.html`
- Eliminacion de cuenta: `https://memorabet.site/eliminar-cuenta.html`
- Soporte: `soporte@memorabet.site`

## Textos de ficha

Nombre:

```text
MemoraBet
```

Descripcion corta:

```text
Juego de memoria con duelos, ranking y saldo ficticio. Sin dinero real.
```

Descripcion larga:

```text
MemoraBet es un juego de memoria competitivo con estetica de casino, duelos, ranking, historial y personalizacion de cartas.

El objetivo es encontrar parejas, memorizar movimientos y competir en diferentes modos de juego:

- Modo solo.
- Duelo de pares.
- Duelo de memoria.
- Ranking e historial.
- Tienda de cartas con saldo ficticio.

MemoraBet no usa dinero real, no permite apuestas reales y no entrega premios reales. Todo saldo, copa, medalla o recompensa dentro del juego es ficticio y solo sirve para la experiencia del juego.
```

Categoria sugerida:

```text
Juego / Cartas o Casual
```

Correo de soporte:

```text
soporte@memorabet.site
```

## Seguridad de datos

Datos que puede declarar:

- Informacion personal: correo electronico, identificador de usuario, nickname.
- Actividad en la app: ranking, historial, partidas, progreso, saldo ficticio.
- Identificadores: Firebase Auth UID.

Uso de datos:

- Funcionamiento de la app.
- Administracion de cuenta.
- Seguridad, prevencion de abuso y fraude.
- Ranking, historial y progreso del juego.

Compartido con terceros:

- Firebase/Google procesa los datos necesarios para autenticacion, base de datos y funciones.

Eliminacion de datos:

- Disponible dentro de la app en Configuracion > Eliminar cuenta.
- Disponible por web en `https://memorabet.site/eliminar-cuenta.html`.

## Politica de dinero real

Declarar claramente:

```text
MemoraBet no usa dinero real, no permite apuestas con dinero real y no entrega premios reales. Todo saldo o recompensa es ficticio.
```

## Pruebas antes de enviar

- Instalar APK/AAB en Android.
- Crear cuenta con correo.
- Iniciar sesion con Google.
- Cerrar sesion.
- Eliminar cuenta.
- Jugar modo solo.
- Jugar duelo de pares.
- Jugar duelo de memoria.
- Probar ranking.
- Probar historial.
- Probar tienda.
- Probar perfil/avatar.
- Probar idioma.
- Probar audio.
- Probar online con dos cuentas si es posible.

## Requisitos de cuenta Google Play

Si tu cuenta de desarrollador es personal y aplica el requisito actual de Google, prepara prueba cerrada con al menos 12 testers durante 14 dias antes de pedir produccion.

Fuentes oficiales:

- Datos de seguridad: https://support.google.com/googleplay/android-developer/answer/10787469
- Eliminacion de cuenta: https://support.google.com/googleplay/android-developer/answer/13327111
- Pruebas para cuentas personales: https://support.google.com/googleplay/android-developer/answer/14151465
- Juegos/apuestas con dinero real: https://support.google.com/googleplay/android-developer/answer/9877032
