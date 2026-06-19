# OTLA Pagos - Contexto del proyecto

Ultima actualizacion: 2026-06-18

## Resumen

OTLA Pagos es una app Next.js para administrar clientes, ordenes, abonos, recordatorios de pago, datos bancarios, documentos fiscales y links publicos para clientes. El flujo principal es:

1. Admin crea clientes.
2. Admin crea ordenes asociadas al cliente.
3. Admin registra abonos manuales o genera solicitudes de pago con Stripe.
4. Cliente consulta un link publico por orden (`/p/[token]`) o un link general por cliente (`/c/[token]`).
5. El sistema puede enviar correos con Resend y WhatsApp con Twilio.

## Stack

- Framework: Next.js 16 App Router.
- UI: React 19, Tailwind CSS v4, componentes locales tipo shadcn en `components/ui`.
- Backend: Supabase Postgres/Auth/Storage.
- Deploy: Vercel.
- Pagos: Stripe Checkout.
- Email: Resend.
- WhatsApp: Twilio WhatsApp.
- PWA: manifest, service worker y registro en `components/PWARegister.tsx`.

## Rutas importantes

- Admin: `/admin`
- Login: `/login`
- Clientes: `/admin/clients`
- Detalle cliente: `/admin/clients/[id]`
- Ordenes: `/admin/orders`
- Detalle orden: `/admin/orders/[id]`
- Configuracion datos bancarios: `/admin/settings/bank-accounts`
- Configuracion docs fiscales: `/admin/settings/fiscal-documents`
- Configuracion Stripe: `/admin/settings/stripe`
- Link publico por orden: `/p/[token]`
- Link publico general por cliente: `/c/[token]`
- Link publico documento fiscal: `/d/[token]`
- Stripe webhook: `/api/stripe/webhook`
- Cron recordatorios: `/api/cron/due-reminders`

## Entornos

### Local

- App local: `http://localhost:3002`
- `.env.local` apunta a Supabase local cuando se trabaja en local.
- Comando:

```bash
npm run dev
```

Validacion:

```bash
npm run lint
npm run build
```

Nota: en una revision reciente el Supabase local no estaba levantado como `supabase_db_pagos` y `localhost:3002` estaba apuntando a otra base local. Si el login local redirige a `/login?error=unauthorized`, revisar `supabase status` y que el proyecto local correcto este corriendo.

### Produccion

- Dominio principal: `https://pagos.sitios-dev.info`
- Proyecto Vercel: `pagos`
- Repo GitHub: `https://github.com/chavamxfaw/pagos`
- Supabase Cloud:
  - Project name: `pagos`
  - Project ref: `vxxanvvpesqerokpsvsh`
  - URL: `https://vxxanvvpesqerokpsvsh.supabase.co`

## Variables de entorno esperadas

No commitear valores reales de secretos. Ver `.env.example` y Vercel env vars.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
ADMIN_EMAIL_NOTIFICACIONES=
CRON_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_PAYMENT_REMINDER_CONTENT_SID=
TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID=
TWILIO_ADMIN_STRIPE_PAYMENT_CONTENT_SID=
STRIPE_SECRET_KEY_TEST=
STRIPE_WEBHOOK_SECRET_TEST=
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET_LIVE=
```

## Modelo funcional

### Clientes

Tabla principal: `clients`.

Campos relevantes:

- `client_portal_token`: token para link general del cliente.
- `client_portal_enabled`: activa/desactiva el link general.
- `email`: opcional. Si no existe, no se envia correo.
- `phone`: usado para WhatsApp cuando existe.

Nota de seguridad: al reactivar el link general del cliente se rota `client_portal_token`, para invalidar links anteriores.

### Ordenes

Tabla principal: `orders`.

Campos relevantes:

- `concept`, `description`
- `category`: `service`, `product`, `project`, `subscription`, `other`
- `tags`: arreglo para busqueda.
- `total_amount`, `paid_amount`, `status`
- `issued_at`, `due_date`
- Factura/IVA:
  - `requires_invoice`
  - `tax_mode`: `none`, `included`, `added`
  - `subtotal_amount`
  - `tax_amount`
  - `tax_rate`
- Recordatorios:
  - `payment_reminder_enabled`
  - `payment_reminder_days_before`
  - `payment_reminder_last_sent_on`
- Link publico:
  - `token`
  - `public_sort_order`
  - `public_show_fiscal_document`
  - `fiscal_document_id`
- Datos bancarios:
  - `bank_account_id`

### Abonos

Tabla principal: `payments`.

Campos relevantes:

- `amount`
- `concept`
- `payment_method`: `cash`, `transfer`, `card`, `check`, `other`
- `paid_at`: fecha real del abono, puede ser anterior al dia de captura.

Cuando se registra un abono, se actualiza el estado de la orden y se pueden enviar notificaciones segun correo/telefono disponible.

### Datos bancarios

Tabla principal: `bank_accounts`.

Sirve para guardar cuentas propias y asociarlas a ordenes. Si una orden tiene cuenta bancaria asociada, el cliente la ve en el link publico y el admin puede copiar/enviar esos datos.

### Documentos fiscales

Tabla principal: `fiscal_documents`.

Sirve para subir PDFs como constancia fiscal y generar links publicos `/d/[token]`.

Flujo actual:

- Admin sube/gestiona documentos fiscales en `/admin/settings/fiscal-documents`.
- En una orden se puede seleccionar una constancia y activar `public_show_fiscal_document`.
- Si esta activo, el link aparece en `/p/[token]` y en la orden dentro de `/c/[token]`.

Seguridad de archivo: al subir PDFs se valida que el archivo empiece con magic header `%PDF-`, no solo el MIME declarado por el navegador.

### Stripe

Tablas principales:

- `stripe_settings`
- `stripe_payment_requests`
- `stripe_checkout_sessions`

Flujo:

1. Admin configura Stripe en `/admin/settings/stripe`.
2. Admin solicita pago Stripe desde la orden.
3. Solicitud puede ser monto fijo o monto abierto con minimo.
4. Cliente paga desde link publico.
5. Webhook registra el pago y dispara notificaciones.

Seguridad/consistencia:

- Solo puede existir una solicitud Stripe pendiente por orden.
- Solo puede existir un checkout pendiente por solicitud de pago.
- El checkout se reutiliza si el cliente vuelve a intentar pagar una solicitud pendiente.
- El webhook valida `payment_status = paid`, moneda MXN, monto cobrado, saldo pendiente y estado de la solicitud antes de registrar abono.
- El webhook marca primero el checkout como `paid` con condicion `status = pending` para reducir riesgo de doble procesamiento.

Comision:

- `commission_payer`: `merchant` o `customer`.
- `fee_percent`, `fixed_fee_amount`, `minimum_payment_amount`.

### Notificaciones

Email:

- Resend, desde `RESEND_FROM_EMAIL`.
- Templates React Email en `emails/`.

WhatsApp:

- Twilio WhatsApp.
- Reminders usan `TWILIO_PAYMENT_REMINDER_CONTENT_SID`.
- Datos bancarios usan `TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID`.
- Aviso admin por pago Stripe usa `TWILIO_ADMIN_STRIPE_PAYMENT_CONTENT_SID`.

Importante: WhatsApp business initiated requiere template aprobado. Mensajes libres fallan fuera de la ventana de 24 horas.

### Recordatorios automaticos

Vercel Cron configurado en `vercel.json`:

```json
{
  "path": "/api/cron/due-reminders",
  "schedule": "0 14 * * *"
}
```

La ruta `/api/cron/due-reminders` busca ordenes con `payment_reminder_enabled = true`, fecha limite y configuracion de dias antes. Evita duplicar con `payment_reminder_last_sent_on`.

Seguridad: `CRON_SECRET` es obligatorio. Si no existe, la ruta falla con 500 en lugar de quedar abierta accidentalmente.

## Seguridad actual

- Admin protegido por Supabase Auth y allowlist en `app_admin_users`.
- `middleware.ts` protege `/admin`.
- Rate limit por IP en middleware:
  - `/login`: scope `auth`
  - `/p/*`, `/c/*`, `/d/*`: scope `public_link`
- Rate limit adicional:
  - `/api/stripe/checkout`: scope `stripe_checkout`
  - Login y checkout Stripe usan fail-closed si no se puede validar el limite.
- Tabla y funcion:
  - `ip_rate_limits`
  - `check_ip_rate_limit`
- RLS endurecido por migraciones, especialmente `20260506221318_admin_allowlist_security.sql`.
- Service role solo debe usarse en server actions/API server.
- Headers globales en `next.config.ts`:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `Permissions-Policy`
- `lib/user-settings.ts` concentra lecturas server-only de settings que usan service role.
- Links publicos de orden completada:
  - `/p/[token]` expira 30 dias despues de completar/liquidar.
  - `/c/[token]` ya no muestra ordenes completadas que hayan expirado por la misma regla.
- Migracion aplicada en Supabase produccion:
  - `20260530190000_security_hardening.sql`
  - `security_hardening`

Pendiente de auditoria de seguridad:

- Revisar manualmente `app_admin_users` en Supabase Cloud para confirmar que solo existan admins esperados. En el ultimo intento, el MCP pidio reautenticacion para consultar la tabla despues de aplicar migracion.
- Migrar `middleware.ts` a `proxy` cuando convenga, porque Next.js muestra warning de deprecacion, aunque hoy no bloquea.

Pendiente recomendado antes de SaaS:

- Multi-tenant real: organizaciones, miembros, scoping por tenant en todas las queries.
- Auditoria de politicas RLS despues de multi-tenant.
- Backups automatizados fuera de Supabase.
- Rate limiting adicional por usuario/accion sensible, no solo IP.

## UI / UX actual

Admin:

- Sidebar con secciones principal, gestion, configuracion y cuenta.
- Buscador global en header.
- Dashboard con metricas, ordenes recientes, pagos por metodo y abonos recientes.
- Clientes con filtros, acciones rapidas y export CSV.
- Ordenes con filtros, tabs de estado, cards y acciones.

Links publicos:

- `/p/[token]`: estado de una orden.
- `/c/[token]`: resumen global del cliente y ordenes.
- Muestran datos bancarios, pagos, historial, Stripe cuando aplica, desglose fiscal y constancia fiscal si se activo.

Paleta marca OTLA:

- Morado: `#6C5CE7`
- Azul: `#4A8BFF`
- Gradiente: `linear-gradient(135deg, #6C5CE7 0%, #4A8BFF 100%)`
- Verde success: `#2ED39A`
- Fondo: `#F5F7FB`
- Cards: `#FFFFFF`
- Bordes: `#E6EAF0`
- Texto principal: `#1A1F36`
- Texto secundario: `#6B7280`
- Pendiente: `#F4B740`
- Error/vencido: `#EF4444`

## Estado de deploy al 2026-06-18

Ultimos commits relevantes:

- `16a0c76 Endurece seguridad de pagos y accesos`
- `3bbe93c Agrega reordenamiento de ordenes por cliente`
- `43be685 Agrega opciones publicas por orden`
- `0113403 Agrega rate limit y recordatorios automaticos`

El hardening de seguridad ya se empujo a GitHub y quedo desplegado en Vercel produccion. Se validaron headers en `https://pagos.sitios-dev.info/login` y `https://pagos.sitios-dev.info/manifest.json`.

Archivos PNG sueltos sin trackear que no se deben commitear automaticamente salvo que se confirme su uso:

- `favicon-otla.png`
- `otla-logo.png`
- `otla-white.png`
- `render-otla.png`

## Flujo recomendado de trabajo

1. Hacer cambios local.
2. Probar en `http://localhost:3002`.
3. Ejecutar:

```bash
npm run lint
npm run build
```

4. Si hay migraciones, aplicarlas primero en Supabase produccion solo cuando el usuario autorice.
5. Commit/push a GitHub.
6. Deploy Vercel production.
7. Verificar:

```bash
curl -I -s https://pagos.sitios-dev.info/admin
```

Debe redirigir a `/login` si no hay sesion.

## Archivos clave

- `actions/orders.ts`: crear/editar/borrar/completar ordenes y ordenar publicamente.
- `actions/payments.ts`: abonos manuales y reenvio/notificacion.
- `actions/clients.ts`: clientes y link general.
- `actions/bank-accounts.ts`: datos bancarios y envio por WhatsApp.
- `actions/fiscal-documents.ts`: documentos fiscales.
- `actions/stripe-payment-requests.ts`: solicitudes de pago Stripe.
- `actions/stripe-settings.ts`: configuracion Stripe.
- `lib/public-orders.ts`: carga datos para `/p/[token]`.
- `lib/public-clients.ts`: carga datos para `/c/[token]`.
- `lib/order-reminder-notifications.ts`: recordatorios manuales/automaticos.
- `lib/payments/notifications.ts`: recibos/notificaciones de abono.
- `lib/admin-stripe-notifications.ts`: avisos al admin por Stripe.
- `lib/security/rate-limit.ts`: rate limit.
- `middleware.ts`: proteccion admin y rate limit.
- `vercel.json`: cron.
- `supabase/migrations/`: historial de esquema.

## Notas operativas

- No usar `git reset --hard` ni revertir cambios sin confirmacion.
- Excluir cambios no relacionados al commitear, especialmente assets sueltos.
- Si Vercel build muestra warning de `middleware` deprecado, no bloquea; eventualmente conviene migrar a `proxy`.
- Si en build local aparece `Stripe settings table is not available yet`, puede ser por desalineacion de Supabase local; no necesariamente bloquea produccion.
- Para cambios de Supabase en produccion, preferir MCP `apply_migration` con SQL de migracion y luego verificar con query.
