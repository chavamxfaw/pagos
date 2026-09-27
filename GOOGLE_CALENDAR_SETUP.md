# Conectar Google Calendar

La agenda diferencia tres estados: configuración del servidor, base de datos preparada y consentimiento de cada cuenta de Google. Tener variables configuradas no significa que una cuenta ya esté conectada. El botón **Conectar Google** permanece visible y explica por qué está deshabilitado.

## Preparación

1. En un proyecto de Google Cloud destinado a este entorno, habilita Google Calendar API y configura la pantalla de consentimiento OAuth. Para pruebas, agrega explícitamente las cuentas de prueba permitidas.
2. Crea un cliente OAuth de tipo aplicación web. Registra la URI de retorno exacta que muestra el verificador: `/api/calendar/google/callback` bajo el origen de la aplicación. No mezcles las credenciales del entorno de pruebas con producción.
3. Configura `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CALENDAR_TOKEN_KEY` y `NEXT_PUBLIC_APP_URL`. La clave de calendario debe ser una clave aleatoria de 32 bytes codificada en base64; guarda su valor en el administrador de secretos. No la incluyas en Git, capturas ni registros. Debe mantenerse estable para poder descifrar las conexiones existentes.
4. Aplica las migraciones de calendario y recuperación mediante el proceso de despliegue revisado. El verificador de variables no comprueba tablas, permisos de Google ni consentimiento.
5. Ejecuta `node scripts/calendar-readiness.mjs` con las variables cargadas en el proceso; alternativamente, `node scripts/calendar-readiness.mjs --env-file RUTA_DEL_ARCHIVO_PRIVADO`. Solo muestra requisitos faltantes y URI de retorno, nunca valores secretos.
6. Inicia sesión y abre **Agenda → Conectar Google**. El propietario elige personalmente la cuenta y concede permisos. Al regresar, la agenda muestra confirmación o un error recuperable. Puede repetirse con varias cuentas.
7. Selecciona calendarios que bloquean disponibilidad y crea un enlace cuyo destino permita escritura. Una cuenta conectada con permisos de lectura sirve para evitar conflictos, pero no como destino de nuevas citas.

## OAuth local: activación explícita

`npm run dev:local` mantiene Google, WhatsApp, Stripe y correo deshabilitados aunque existan credenciales heredadas. Utiliza únicamente la base local aislada en `127.0.0.1:54421`.

Para probar Google deliberadamente, crea `.env.calendar.local` (ya excluido por `.gitignore`) con credenciales de un proyecto/cuenta de prueba:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CALENDAR_TOKEN_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

Verifica primero:

```sh
node scripts/calendar-readiness.mjs --env-file .env.calendar.local
npm run dev:local -- --google-calendar
```

El lanzador lee únicamente las tres variables privadas de Google de este archivo, fija el origen en `http://localhost:3002` y conserva deshabilitados los otros proveedores. Si el archivo falta o la configuración es inválida, se detiene antes de cambiar el usuario local. Registra `http://localhost:3002/api/calendar/google/callback` en el cliente OAuth y usa siempre `localhost:3002` en el navegador para mantener las cookies de estado.

La activación no autoriza una cuenta automáticamente. Al conectarla, las reservas y bloqueos posteriores pueden crear eventos reales en ese calendario de prueba. Al terminar, detén el servidor y vuelve a `npm run dev:local` para desactivar Google; revoca el acceso desde Google si deseas retirar el consentimiento.

## Revisión de reservas

Las reservas públicas permanecen sin vincular a contactos hasta que el propietario verifica la identidad y aprueba un contacto explícitamente en **Lista de citas**. No debe aprobarse solo por coincidencia de correo. La lista muestra también reservas que requieren revisión tras fallos de sincronización y permite reintentar; una cancelación en proceso se reintenta como cancelación.

## Comprobación local

`node --test scripts/calendar-setup.test.mjs` valida configuración, orígenes permitidos y que el modo local sin autorización explícita borre credenciales heredadas. No contacta Google ni Supabase.
