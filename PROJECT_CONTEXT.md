# OTLA Pagos - Contexto del proyecto

Ultima actualizacion: 2026-09-10 (Monterrey)

## Actualización CRM local — pendiente de publicación

La evolución a Chava Cervantes CRM está implementada localmente. Ver `CRM_IMPLEMENTATION.md` como fuente vigente para nuevas rutas, agenda Google, WhatsApp, OpenClaw, migraciones, pruebas y límites. La descripción posterior conserva contexto histórico del sistema de pagos y no implica que el rediseño ya esté desplegado.

Importante: configurar `OTLA_AGENT_OWNER_ID` antes de publicar; los pagos del agente requieren ahora `Idempotency-Key`. No habilitar otros negocios: el panel maestro es inventario y los recursos financieros históricos aún no tienen aislamiento multi-tenant completo.

Este documento resume el estado funcional, tecnico y operativo de OTLA Pagos para poder retomar el proyecto sin depender del historial del chat.

## Resumen Ejecutivo

OTLA Pagos es una aplicacion web para controlar clientes, ordenes, abonos, recordatorios, datos bancarios, documentos fiscales, links publicos para clientes, pagos con Stripe y una API privada para integracion con agentes como OpenClaw.

Flujo principal:

1. El administrador crea clientes.
2. El administrador crea ordenes asociadas a clientes.
3. El administrador registra abonos manuales o genera solicitudes de pago con Stripe.
4. El cliente consulta su link publico por orden o su link general de cliente.
5. El sistema puede enviar notificaciones por correo con Resend y WhatsApp con Twilio.
6. OpenClaw puede consultar/resumir/crear clientes, ordenes y abonos mediante API privada.

## Stack

- Framework: Next.js 16 App Router.
- Runtime UI: React 19.
- Estilos: Tailwind CSS v4.
- Componentes: componentes locales tipo shadcn en `components/ui`.
- Backend: Supabase Postgres, Auth y Storage.
- Deploy: Vercel.
- Repo: GitHub.
- Pagos: Stripe Checkout.
- Email: Resend.
- WhatsApp: Twilio WhatsApp.
- PWA: manifest, service worker y registro client-side.

## Ubicacion Local

Proyecto:

```txt
/Users/chavamini/Documents/web/pagos
```

Archivos de contexto/documentacion:

- `PROJECT_CONTEXT.md`: este documento.
- `OPENCLAW_AGENT_API.md`: documentacion de API privada para OpenClaw.
- `DEPLOYMENT.md`: notas de deploy inicial.
- `README.md`: README base.

## Entornos

### Local

URL comun de trabajo:

```txt
http://localhost:3002
```

Comando:

```bash
npm run dev
```

Validacion antes de deploy:

```bash
npm run lint
npm run build
```

Nota: si local redirige a `/login?error=unauthorized`, revisar que Supabase local corresponda al proyecto correcto. En revisiones previas, el build local aviso `Stripe settings table is not available yet` porque `.env.local` apuntaba a una base local que no tenia el esquema completo.

### Produccion

Dominio principal:

```txt
https://pagos.sitios-dev.info
```

Vercel:

```txt
Project: chavamxs-projects/pagos
```

GitHub:

```txt
https://github.com/chavamxfaw/pagos
```

Supabase:

```txt
Project name: pagos
Project ref: vxxanvvpesqerokpsvsh
URL: https://vxxanvvpesqerokpsvsh.supabase.co
```

## Rutas Principales

Admin:

- `/login`
- `/admin`
- `/admin/clients`
- `/admin/clients/new`
- `/admin/clients/[id]`
- `/admin/clients/[id]/edit`
- `/admin/orders`
- `/admin/orders/new`
- `/admin/orders/[id]`
- `/admin/orders/[id]/edit`
- `/admin/profile`
- `/admin/settings/bank-accounts`
- `/admin/settings/fiscal-documents`
- `/admin/settings/stripe`

Publicas:

- `/p/[token]`: link publico de una orden.
- `/c/[token]`: link publico general de cliente.
- `/d/[token]`: link publico de documento fiscal.
- `/r/[token]`: recibo publico de un abono.

APIs:

- `/api/auth/callback`
- `/api/cron/due-reminders`
- `/api/stripe/checkout`
- `/api/stripe/webhook`
- `/api/agent/summary`
- `/api/agent/clients`
- `/api/agent/orders`
- `/api/agent/payments`

## Variables de Entorno

No commitear valores reales. Ver `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
ADMIN_EMAIL_NOTIFICACIONES=
CRON_SECRET=
OTLA_AGENT_API_KEY=
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

Notas:

- `OTLA_AGENT_API_KEY` esta configurada en Vercel como variable sensitive.
- La llave de OpenClaw fue rotada y validada en produccion el 2026-07-29. No debe guardarse en este archivo.
- En OpenClaw debe usarse como secreto, no como texto en prompts visibles.

## Modelo Funcional

### Clientes

Tabla principal: `clients`.

Campos relevantes:

- `name`
- `email`: opcional. Si no existe, no se envia correo.
- `phone`: opcional. Si existe, puede usarse para WhatsApp.
- `company`
- `rfc`
- `address`
- `notes`
- `client_portal_enabled`
- `client_portal_token`

Comportamiento:

- El admin puede crear, editar, eliminar y buscar clientes.
- El link general del cliente se puede activar/desactivar manualmente.
- Al reactivar el link general se rota `client_portal_token` para invalidar links anteriores.
- En detalle de cliente se muestran resumen financiero, seguimiento, bitacora y ordenes relacionadas.
- Las ordenes del cliente pueden ordenarse para controlar el orden visible en el link general publico.

### Ordenes

Tabla principal: `orders`.

Campos relevantes:

- `client_id`
- `concept`
- `description`
- `category`: `service`, `product`, `project`, `subscription`, `other`
- `tags`: arreglo para busqueda.
- `total_amount`
- `paid_amount`
- `status`
- `issued_at`
- `due_date`
- `token`
- `public_sort_order`
- `bank_account_id`
- `fiscal_document_id`
- `public_show_fiscal_document`
- `notify_email_enabled`
- `notify_whatsapp_enabled`

Factura/IVA:

- `requires_invoice`
- `tax_mode`: `none`, `included`, `added`
- `subtotal_amount`
- `tax_amount`
- `tax_rate`

Recordatorios:

- `payment_reminder_enabled`
- `payment_reminder_days_before`
- `payment_reminder_last_sent_on`

Comportamiento:

- Se pueden crear, editar, borrar y marcar como completadas.
- El admin puede agregar abonos manuales.
- El admin puede enviar recordatorios manuales.
- El admin puede solicitar pagos Stripe desde la orden.
- El admin puede prender/apagar por orden las notificaciones al cliente por correo y WhatsApp.
- El link publico individual `/p/[token]` muestra estado, abonos, datos bancarios, Stripe si aplica, desglose fiscal y constancia fiscal si se activo.
- Los links de orden completada permanecen visibles 30 dias despues de liquidarse; despues expiran.

### Abonos

Tabla principal: `payments`.

Campos relevantes:

- `order_id`
- `amount`
- `concept`
- `payment_method`: `cash`, `transfer`, `card`, `check`, `stripe`, `other`
- `paid_at`
- `notes`
- `receipt_token`
- `receipt_issued_at`

Comportamiento:

- La fecha del abono puede ser anterior a la fecha de captura.
- El sistema actualiza `paid_amount` y `status` de la orden.
- Si el cliente tiene email/telefono, se disparan notificaciones normales segun configuracion de la orden.
- El link publico muestra historial de abonos con metodo de pago.
- Cada abono tiene recibo publico en `/r/[receipt_token]`, independiente de la expiracion del link de orden.
- Los recibos se pueden compartir, copiar e imprimir/guardar como PDF desde el navegador.

### Datos Bancarios

Tabla principal: `bank_accounts`.

Uso:

- El admin guarda cuentas bancarias propias.
- Una orden puede asociarse a una cuenta bancaria.
- Si la orden tiene cuenta bancaria asociada, aparece en el link publico como recordatorio de pago.
- El admin puede copiar datos o enviarlos por WhatsApp.

### Documentos Fiscales

Tabla principal: `fiscal_documents`.

Uso:

- El admin sube PDFs, por ejemplo constancia fiscal.
- Se genera link publico `/d/[token]`.
- Una orden puede activar/desactivar si muestra una constancia fiscal.
- Si esta activo, el link aparece en `/p/[token]` y dentro de esa orden en `/c/[token]`.

Seguridad de archivo:

- Se valida magic header `%PDF-`, no solo MIME declarado por navegador.

### Stripe

Tablas principales:

- `stripe_settings`
- `stripe_payment_requests`
- `stripe_checkout_sessions`

Flujo:

1. Admin configura Stripe en `/admin/settings/stripe`.
2. Admin solicita pago Stripe desde la orden.
3. Solicitud puede ser de monto fijo o monto abierto con minimo.
4. Cliente paga desde link publico.
5. Stripe webhook valida y registra abono.
6. Se disparan notificaciones normales del pago.
7. Se puede notificar al admin por correo/WhatsApp cuando alguien paga por Stripe.

Seguridad/consistencia:

- Solo puede existir una solicitud Stripe pendiente por orden.
- Solo puede existir un checkout pendiente por solicitud.
- El checkout se reutiliza si el cliente vuelve a abrir la misma solicitud pendiente.
- El webhook valida:
  - `payment_status = paid`
  - moneda MXN
  - monto cobrado
  - saldo pendiente
  - estado de solicitud
- El webhook marca primero el checkout como `paid` con condicion `status = pending` para reducir doble procesamiento.

Configuracion de comision:

- `commission_payer`: `merchant` o `customer`
- `fee_percent`
- `fixed_fee_amount`
- `fee_tax_percent`
- `minimum_payment_amount`

Formula importante:

- Si el comercio absorbe comision, el cliente paga exactamente el abono.
- Si el cliente paga comision, el sistema usa gross-up para calcular el total a cobrar y que el abono neto esperado quede cubierto despues de:
  - comision porcentual
  - comision fija
  - IVA/impuesto sobre la comision

Ejemplo reciente:

- Abono deseado: `$6,000.00`
- Configuracion: `3.6% + $3.00 + 16% IVA sobre comision`
- Cargo estimado al cliente: `$6,265.11`
- Comision estimada: `$265.11`
- Neto esperado: `$6,000.00`

### Notificaciones

Email:

- Proveedor: Resend.
- Remitente: `RESEND_FROM_EMAIL`.
- Templates React Email en `emails/`.
- Nombre remitente fue ajustado para usar marca OTLA en lugar de texto generico.
- Los recibos de abono por correo incluyen CTA a `/r/[receipt_token]` cuando el abono tiene token.
- Las notificaciones automaticas al cliente respetan `orders.notify_email_enabled`.

WhatsApp:

- Proveedor: Twilio WhatsApp.
- Requiere templates aprobados para conversaciones iniciadas por negocio.
- Mensajes libres fuera de la ventana de 24 horas fallan con error de Twilio/WhatsApp.
- Las notificaciones automaticas al cliente respetan `orders.notify_whatsapp_enabled`.
- El envio manual de datos bancarios por WhatsApp se bloquea si la orden tiene WhatsApp desactivado.

Templates relevantes:

- `TWILIO_PAYMENT_REMINDER_CONTENT_SID`: recordatorio/estado de pago.
- `TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID`: datos bancarios.
- `TWILIO_ADMIN_STRIPE_PAYMENT_CONTENT_SID`: aviso a admin por pago Stripe.

### Recordatorios Automaticos

Vercel Cron:

```json
{
  "path": "/api/cron/due-reminders",
  "schedule": "0 14 * * *"
}
```

La ruta `/api/cron/due-reminders` busca ordenes con:

- `payment_reminder_enabled = true`
- `due_date` configurado
- `payment_reminder_days_before` compatible con la fecha actual

Evita duplicados con `payment_reminder_last_sent_on`.

Seguridad:

- `CRON_SECRET` es obligatorio.
- Si no existe, la ruta falla con 500 para evitar dejarla abierta por accidente.

## API Privada para OpenClaw

Documentacion completa:

```txt
OPENCLAW_AGENT_API.md
```

Base URL:

```txt
https://pagos.sitios-dev.info/api/agent
```

Autenticacion:

```http
Authorization: Bearer TU_OTLA_AGENT_API_KEY
X-Agent-Name: openclaw
```

Endpoints:

- `GET /api/agent/summary`
- `GET /api/agent/clients`
- `POST /api/agent/clients`
- `GET /api/agent/orders`
- `POST /api/agent/orders`
- `POST /api/agent/payments`

Alcance:

- Consultar resumen.
- Buscar/listar clientes.
- Crear clientes.
- Buscar/listar ordenes.
- Crear ordenes.
- Registrar abonos.

Restricciones:

- No puede borrar clientes.
- No puede borrar ordenes.
- No puede borrar abonos.
- No puede modificar configuracion.
- No puede leer secretos.

Seguridad:

- Usa `OTLA_AGENT_API_KEY`.
- Rate limit dedicado `agent_api`.
- Escrituras registran actividad con eventos prefijados por agente.
- Los abonos validan saldo pendiente.
- Las notificaciones solo se disparan si existen datos de contacto.

Validacion realizada en produccion:

- Sin token: `401 Unauthorized`.
- Con token correcto: `200 OK`.

## Seguridad Actual

Autenticacion/admin:

- Admin protegido por Supabase Auth.
- `middleware.ts` protege `/admin`.
- Allowlist mediante `app_admin_users`.
- Service role solo debe usarse en server actions y API server.

Rate limit:

- `/login`: scope `auth`.
- `/p/*`, `/c/*`, `/d/*`: scope `public_link`.
- `/api/stripe/checkout`: scope `stripe_checkout`.
- `/api/agent/*`: scope `agent_api`.

Tablas/funciones:

- `ip_rate_limits`
- `check_ip_rate_limit`

Headers globales en `next.config.ts`:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `Permissions-Policy`

Hardening aplicado:

- RLS endurecido por migraciones, especialmente `20260506221318_admin_allowlist_security.sql`.
- Cron protegido con `CRON_SECRET` fail-closed.
- PDF validado por magic header.
- Settings server-only concentrados en `lib/user-settings.ts`.
- Stripe webhook con validaciones de monto, moneda, estado y saldo.
- Agent API protegida por bearer token y rate limit.

Pendientes recomendados:

- Migrar `middleware.ts` a `proxy` cuando convenga, porque Next.js 16 muestra warning de deprecacion.
- Auditoria periodica de `app_admin_users`.
- Backups automatizados fuera de Supabase.
- Rate limit por usuario/accion sensible ademas de IP.
- Multi-tenant real antes de convertirlo en SaaS.

## Estado de Migraciones

Supabase produccion tiene historial con varias migraciones remotas que no existen como archivos locales, porque en etapas previas se aplicaron cambios directos desde dashboard/CLI/MCP.

Situacion operativa:

- `supabase db push --dry-run` puede fallar por drift de historial.
- Para cambios puntuales en produccion, se ha usado MCP `apply_migration` con SQL de migracion y verificacion posterior con query.
- No reparar historial remoto automaticamente sin revisar, porque podria marcar migraciones remotas como revertidas.

Migraciones recientes relevantes:

- `20260618190000_agent_api_rate_limit_scope.sql`
- `20260729190000_stripe_fee_tax_percent.sql`
- `20260804012856_payment_receipts_order_notifications.sql`

Todas fueron aplicadas en Supabase produccion.

La migracion `20260804012856_payment_receipts_order_notifications.sql` agrega:

- `orders.notify_email_enabled`
- `orders.notify_whatsapp_enabled`
- `payments.receipt_token`
- `payments.receipt_issued_at`
- indice unico `payments_receipt_token_idx`
- soporte `stripe` en el check constraint de `payments.payment_method`

Verificacion remota realizada:

- Proyecto Supabase correcto: `vxxanvvpesqerokpsvsh`.
- `supabase migration list --linked` muestra `20260804012856` aplicada.
- `supabase db dump --linked --schema public` confirma columnas e indice.

Nota local/Docker:

- `.env.local` apunta a `http://127.0.0.1:54321`.
- Los puertos locales `54321/54322/54323/54324/54327` estaban ocupados por otro proyecto Docker (`vendlytics-local`).
- `supabase status` en `pagos` puede fallar con `No such container: supabase_db_pagos` si no esta levantado el stack local de este proyecto.
- No detener contenedores de otros proyectos automaticamente.

Metodo usado para aplicar la migracion reciente por drift:

- Se creo un workdir temporal en `/tmp` con placeholders para migraciones remotas faltantes y la migracion nueva real.
- Se ejecuto `supabase migration up --linked --workdir ...`.
- Esto evito usar `supabase db push` directo sobre un historial con drift.

## PWA

El proyecto tiene configuracion PWA:

- `public/manifest.json`
- `public/sw.js`
- Registro de service worker en componente cliente.
- Metas de iOS y theme color en layout.

Nota:

- PWA instalable no equivale automaticamente a push notifications.
- Push notifications requeriria implementar Push API, suscripciones, permisos, VAPID keys y backend de envio.

## UI / UX Actual

Admin:

- Sidebar con secciones:
  - Principal
  - Gestion
  - Configuracion
  - Cuenta
- Sidebar colapsable con iconos.
- Buscador global en header.
- Notificaciones en header.
- Dashboard con:
  - metricas principales
  - resumen visual
  - ordenes recientes
  - pagos por metodo
  - abonos recientes
- Clientes con:
  - filtros
  - acciones rapidas
  - export CSV
  - detalle con resumen y ordenes
- Ordenes con:
  - tabs por estado
  - filtros
  - cards
  - acciones rapidas por card
  - export CSV

Links publicos:

- `/p/[token]`: estado de cuenta por orden.
- `/c/[token]`: resumen global del cliente y ordenes.
- `/r/[token]`: recibo publico de un abono manual o Stripe.
- Se rediseñaron hacia un estilo mas limpio, moderno y centrado en estado financiero.
- Muestran:
  - total
  - pagado
  - pendiente
  - progreso
  - historial de abonos
  - datos bancarios
  - Stripe cuando aplica
  - desglose fiscal
  - constancia fiscal si se activo
  - link a recibo por abono cuando existe `receipt_token`

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

## Integraciones Externas

### Supabase

Uso:

- Auth.
- Postgres.
- Storage para documentos fiscales.
- RLS y politicas.

Skill/MCP:

- Para tareas Supabase, usar skill `supabase:supabase`.
- MCP project id/ref correcto: `vxxanvvpesqerokpsvsh`.
- Produccion ya tiene aplicada la migracion de recibos/notificaciones por orden `20260804012856`.
- Hay drift entre historial remoto y archivos locales de migraciones; revisar antes de usar comandos que sincronicen todo el historial.
- Local Docker de `pagos` no estaba activo al ultimo corte; habia otros stacks ocupando los puertos default.

### Vercel

Uso:

- Deploy production.
- Variables de entorno.
- Cron.

Validacion comun:

```bash
curl -I -s https://pagos.sitios-dev.info/admin
```

Debe responder `307` hacia `/login` si no hay sesion.

### GitHub

Repo:

```txt
https://github.com/chavamxfaw/pagos
```

Rama principal:

```txt
main
```

### Resend

Dominio usado para correo:

```txt
notificaciones.sitios-dev.info
```

### Twilio WhatsApp

Uso:

- Recordatorios de pago.
- Datos bancarios.
- Avisos a admin por Stripe.

Importante:

- Los templates deben estar aprobados para envios iniciados por negocio.

### Stripe

Modo:

- Configurable entre `test` y `live` desde settings.

Webhook:

- Usar secret segun modo:
  - `STRIPE_WEBHOOK_SECRET_TEST`
  - `STRIPE_WEBHOOK_SECRET_LIVE`

## Ultimos Cambios Relevantes

Cambios locales recientes para recibos y notificaciones por orden:

- Se agrego ruta publica `/r/[token]` para recibos de abonos.
- Se agrego generacion de recibo por cada pago con `receipt_token` y `receipt_issued_at`.
- El historial publico de abonos muestra accion para ver recibo.
- Los correos de recibo incluyen CTA para descargar/ver recibo.
- Las ordenes tienen configuracion `notify_email_enabled` y `notify_whatsapp_enabled`.
- Los recordatorios y recibos al cliente respetan esas preferencias por orden.
- `payment_method` ya contempla `stripe`.
- Validacion local: `npm run lint` paso.
- Validacion local: `npm run build` paso.
- Warning conocido: Next.js 16 recomienda migrar `middleware.ts` a `proxy`.

Estado de despliegue de estos cambios:

- La migracion `20260804012856` ya esta aplicada y verificada en Supabase produccion.
- No asumir que el codigo de recibos/notificaciones esta desplegado en Vercel o empujado a GitHub hasta revisar `git status`, commits y ultimo deploy.

Commits recientes:

- `74a989e Ajusta calculo de comision Stripe`
- `aa435da Agrega API privada para agente`
- `baf38c9 Actualiza contexto del proyecto`
- `16a0c76 Endurece seguridad de pagos y accesos`

Deploy reciente:

- Se hizo deploy production en Vercel despues de configurar/rotar `OTLA_AGENT_API_KEY`.
- Se valido `GET /api/agent/summary`:
  - sin token: `401`
  - con token: `200`

## Archivos Clave

Acciones:

- `actions/clients.ts`
- `actions/orders.ts`
- `actions/payments.ts`
- `actions/bank-accounts.ts`
- `actions/fiscal-documents.ts`
- `actions/stripe-settings.ts`
- `actions/stripe-payment-requests.ts`

API:

- `app/api/agent/summary/route.ts`
- `app/api/agent/clients/route.ts`
- `app/api/agent/orders/route.ts`
- `app/api/agent/payments/route.ts`
- `app/api/stripe/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/cron/due-reminders/route.ts`

Publicas:

- `app/p/[token]/page.tsx`
- `app/c/[token]/page.tsx`
- `app/d/[token]/page.tsx`
- `app/r/[token]/page.tsx`

Librerias:

- `lib/agent/api.ts`
- `lib/payment-receipts.ts`
- `lib/stripe/config.ts`
- `lib/stripe/math.ts`
- `lib/stripe/client.ts`
- `lib/security/rate-limit.ts`
- `lib/public-orders.ts`
- `lib/public-clients.ts`
- `lib/order-reminder-notifications.ts`
- `lib/payments/notifications.ts`
- `lib/admin-stripe-notifications.ts`
- `lib/user-settings.ts`

UI:

- `components/admin/`
- `components/public/`
- `components/public/ReceiptActions.tsx`
- `components/ui/`

Config:

- `middleware.ts`
- `next.config.ts`
- `vercel.json`
- `.env.example`
- `supabase/migrations/`
- `supabase/migrations/20260804012856_payment_receipts_order_notifications.sql`

## Archivos No Trackeados a Cuidar

Estos archivos han aparecido como no rastreados. No commitearlos automaticamente salvo que se confirme su uso:

- `favicon-otla.png`
- `otla-logo.png`
- `otla-white.png`
- `render-otla.png`

## Flujo Recomendado de Trabajo

1. Hacer cambios localmente.
2. Probar en `http://localhost:3002`.
3. Ejecutar:

```bash
npm run lint
npm run build
```

4. Si hay migraciones:
   - revisar SQL
   - aplicar en Supabase solo con autorizacion
   - verificar con query
5. Commit de archivos relacionados solamente.
6. Push a GitHub.
7. Deploy a Vercel production.
8. Verificar produccion.

## Criterios de Seguridad Operativa

- No imprimir secretos en docs o commits.
- No usar `git reset --hard` sin confirmacion explicita.
- No revertir cambios del usuario sin autorizacion.
- No reparar historial de migraciones Supabase sin revisar drift.
- No crear endpoints destructivos para agentes externos sin nueva capa de autorizacion.
- Mantener service role fuera del cliente.
- Mantener OpenClaw limitado a acciones no destructivas.

## Pendientes Estratégicos

Antes de SaaS:

- Multi-tenant real:
  - organizaciones
  - miembros
  - roles
  - scoping por tenant en queries y RLS
- Backups automatizados fuera de Supabase.
- Auditoria de logs/actividad mas completa.
- Rate limits por usuario y tipo de accion.
- Panel de configuracion de notificaciones.
- Politica de cuotas de WhatsApp por usuario/tenant.

Mejoras producto:

- Vista calendario para vencimientos y recordatorios.
- Mejor analitica de cobranza.
- Estado de cartera por cliente.
- Flujo para comprobantes enviados por cliente.
- Stripe con reglas por orden mas avanzadas.
- Exportaciones/reportes.
- Integracion futura con conciliacion bancaria por referencia.
