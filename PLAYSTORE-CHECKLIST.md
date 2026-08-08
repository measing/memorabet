# MemoraBet - checklist para Google Play Console

Ultima actualizacion: 7 de agosto de 2026.

## Estado tecnico

- Paquete Android: `com.memorabet.app`
- Nombre de app: `MemoraBet`
- Firebase Android: configurado con `android/app/google-services.json`
- Google Login Android: usa plugin nativo `@capacitor-firebase/authentication`
- Realtime Database: reglas cerradas para rankings/historial directos
- Realtime Database Rules: desplegadas en `memorabet-77fea`
- Cloud Functions: preparadas, pero pendientes de desplegar porque Firebase exige plan Blaze
- AAB release: generado en `android/app/build/outputs/bundle/release/app-release.aab`
- APK debug: generado en `android/app/build/outputs/apk/debug/app-debug.apk`

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
Juego de memoria con duelos, ranking y Coins ficticias. Sin dinero real.
```

Descripcion larga:

```text
MemoraBet es un juego de memoria competitivo con estetica de casino, duelos, ranking, historial y personalizacion de cartas.

El objetivo es encontrar parejas, memorizar movimientos y competir en diferentes modos de juego:

- Modo solo.
- Duelo de pares.
- Duelo de memoria.
- Ranking e historial.
- Tienda de cartas con Coins ficticias.

MemoraBet no usa dinero real, no permite apuestas reales y no entrega premios reales. Toda Coin, copa, medalla o recompensa dentro del juego es ficticia y solo sirve para la experiencia del juego.
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
- Actividad en la app: ranking, historial, partidas, progreso, Coins ficticias.
- Identificadores: Firebase Auth UID.

Uso de datos:

- Funcionamiento de la app.
- Administracion de cuenta.
- Seguridad, prevencion de abuso y fraude.
- Ranking, historial y progreso del juego.

Compartido con terceros:

- Firebase/Google procesa los datos necesarios para autenticacion y base de datos como proveedor tecnico.
- MemoraBet no vende datos personales.

Eliminacion de datos:

- Disponible dentro de la app en Configuracion > Eliminar cuenta.
- Disponible por web en `https://memorabet.site/eliminar-cuenta.html`.

Texto util para Play Console:

```text
MemoraBet recopila datos necesarios para crear cuenta, guardar progreso, rankings, historial, Coins ficticias y partidas online. Los datos se usan para funcionamiento de la app, administracion de cuenta, seguridad, prevencion de abuso y sincronizacion del juego. MemoraBet no vende datos personales. La eliminacion de cuenta esta disponible dentro de la app y en https://memorabet.site/eliminar-cuenta.html.
```

## Politica de dinero real

Declarar claramente:

```text
MemoraBet no usa dinero real, no permite apuestas con dinero real y no entrega premios reales. Todas las Coins, recompensas, copas y medallas son ficticias y no se pueden comprar, vender, retirar, canjear ni intercambiar por dinero o bienes reales.
```

## Clasificacion de contenido

Respuestas sugeridas para el cuestionario:

- Categoria: juego casual/cartas/memoria.
- Dinero real: no.
- Apuestas con dinero real: no.
- Premios reales: no.
- Compras dentro de la app: no, si no activas pagos reales.
- Publicidad: no, si no agregas anuncios.
- Interaccion online: si, por duelos, amigos, ranking e historial online.
- Contenido generado por usuarios: limitado a nickname/avatar; revisar que nicknames no acepten HTML o JavaScript.
- Tematica de casino: si el cuestionario pregunta por casino o juegos de azar simulados, declararlo como estetica/tematica ficticia sin dinero real.

Texto corto para notas de revision:

```text
MemoraBet usa estetica de casino solo como ambientacion visual. No permite apostar dinero real, no vende Coins, no permite retirar recompensas y no entrega premios reales. Las Coins son ficticias y sirven unicamente para progresar dentro del juego.
```

## Pruebas antes de enviar

- [ ] Subir AAB a Internal testing o Closed testing en Play Console.
- [ ] Instalar desde Google Play testing, no solo APK manual.
- [ ] Crear cuenta con correo.
- [ ] Iniciar sesion con Google.
- [ ] Cerrar sesion.
- [ ] Eliminar cuenta desde Configuracion.
- [ ] Solicitar eliminacion desde `https://memorabet.site/eliminar-cuenta.html`.
- [ ] Jugar modo solo.
- [ ] Jugar duelo de pares.
- [ ] Jugar duelo de memoria.
- [ ] Probar ranking.
- [ ] Probar historial.
- [ ] Probar tienda.
- [ ] Probar perfil/avatar.
- [ ] Probar idioma.
- [ ] Probar audio.
- [ ] Probar online con dos cuentas si es posible.

## Pendientes actuales

- Activar plan Blaze en Firebase si se quieren desplegar Cloud Functions.
- Desplegar Cloud Functions despues de activar Blaze.
- Despues de subir el AAB a Play Console, copiar la SHA-1/SHA-256 de "App signing key certificate" y agregarla en Firebase Android si Google Login falla en la app instalada desde Play.
- Completar Data safety en Play Console.
- Completar declaracion de eliminacion de cuenta en Play Console.
- Preparar ficha de Play Store: icono final, feature graphic, capturas, descripcion, paises, clasificacion de contenido y correo de soporte.
- Realizar prueba cerrada si la cuenta de Play Console lo exige.

## Requisitos de cuenta Google Play

Si tu cuenta de desarrollador es personal y aplica el requisito actual de Google, prepara prueba cerrada con al menos 12 testers durante 14 dias antes de pedir produccion.

Fuentes oficiales:

- Datos de seguridad: https://support.google.com/googleplay/android-developer/answer/10787469
- Eliminacion de cuenta: https://support.google.com/googleplay/android-developer/answer/13327111
- Pruebas para cuentas personales: https://support.google.com/googleplay/android-developer/answer/14151465
- Juegos/apuestas con dinero real: https://support.google.com/googleplay/android-developer/answer/9877032
