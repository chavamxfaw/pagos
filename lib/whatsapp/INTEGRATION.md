# WhatsApp y OpenClaw: configuración y operación

Implementación personal con la allowlist de administradores actual. Los negocios SaaS no se activan como tenants en esta entrega.

## Variables del servidor

- `OTLA_AGENT_API_KEY`: llave bearer existente.
- `OTLA_AGENT_OWNER_ID`: UUID del propietario en `app_admin_users`. Obligatorio para cualquier endpoint del agente; la identidad no se toma de `x-agent-name`.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`: integración existente.
- `TWILIO_WEBHOOK_BASE_URL`: origen HTTPS público opcional; si falta se usa `NEXT_PUBLIC_APP_URL`. Debe coincidir exactamente con el origen de los callbacks configurados en Twilio.
- `TWILIO_DOCUMENT_LINK_CONTENT_SID`, `TWILIO_BOOKING_LINK_CONTENT_SID`: plantillas aprobadas para iniciar conversaciones; variables `1` nombre del contacto, `2` título del recurso, `3` URL completa.
- Se reutilizan `TWILIO_PAYMENT_REMINDER_CONTENT_SID` y `TWILIO_PAYMENT_INSTRUCTIONS_CONTENT_SID` para pagos y datos bancarios con sus variables existentes.
- Versiones opcionales con remitente: `TWILIO_PAYMENT_INSTRUCTIONS_SENDER_CONTENT_SID` conserva variables 1–7 y agrega `8` nombre del remitente; `TWILIO_DOCUMENT_LINK_SENDER_CONTENT_SID` y `TWILIO_BOOKING_LINK_SENDER_CONTENT_SID` conservan 1–3 y agregan `4` remitente. Deben aprobarse por separado en Twilio/Meta antes de configurarlas. Tienen prioridad sobre las versiones antiguas. Nunca se agregan variables a una plantilla antigua; la vista previa y la API advierten si esa plantilla no incluye remitente. Dentro de la ventana de conversación se usa texto libre con firma.

En Twilio, registrar `POST https://DOMINIO/api/whatsapp/inbound` como webhook entrante. El envío configura automáticamente `/api/whatsapp/status?message_id=UUID` para vincular callbacks incluso si llegan antes de la respuesta HTTP. Todas las firmas se comprueban con el SDK oficial de Twilio, la URL pública configurada, todos los parámetros recibidos y el Account SID. El webhook entrante además valida canal WhatsApp y remitente empresarial destino.

## API del propietario

- `POST /api/agent/payments`: contrato anterior más header `Idempotency-Key` obligatorio (16–128 caracteres alfanuméricos, guion, guion bajo o dos puntos). Reutilizar la misma clave para cualquier reintento de la misma operación. Un cambio de datos exige una clave nueva. El registro es una transacción y comprueba saldo bajo bloqueo.
- `GET /api/agent/messages?client_id=UUID`: últimos 100 mensajes.
- `POST /api/agent/messages`: `{client_id,kind,resource_id?,body?,preview?}`. `kind`: `text`, `payment`, `bank`, `document`, `booking`. Enviar requiere `Idempotency-Key`; `preview:true` prepara el contenido sin enviar. `resource_id` es orden para payment/bank, documento fiscal para document, o tipo de reunión para booking. El banco es el asignado a la orden.
- `GET /api/agent/crm?kind=tasks&client_id=UUID`: lectura del módulo propio. `kind` admite opportunities/projects/tasks/proposals/renewals.
- `POST /api/agent/crm`: `{kind,id?,title,status,client_id?,notes?,due_date?,amount?,priority?,next_action?,project_id?,opportunity_id?}`. El importe se llama `amount`; id presente actualiza, ausente crea. Para convertir una oportunidad ganada: `{action:"convert_opportunity",opportunity_id:"UUID"}`. La conversión es idempotente.
- Las órdenes creadas por agente aceptan `crm_project_id`; se comprueba mismo propietario y contacto.

Los mensajes recibidos son datos de conversación. No se interpretan como órdenes de OpenClaw, solicitudes de pago confirmado ni autorización para compartir archivos. La API requiere la llave del propietario por separado.

## Entrega y recuperación

Una respuesta aceptada por Twilio no significa entregada; la bandeja usa callbacks de estado y conserva eventos duplicados/out-of-order sin hacer retroceder el estado.

El nuevo composer permite texto libre solo cuando existe mensaje entrante en las últimas 24 horas; fuera de esa ventana exige la plantilla del tipo seleccionado. Las plantillas deben estar aprobadas antes de habilitarlas. Configurar consentimiento y opt-out del remitente en Twilio/Meta forma parte del alta operacional.

Cada envío se registra antes del contacto con Twilio. Repetir la misma clave devuelve el mismo registro. Un timeout ambiguo queda `unknown`; no hay reenvío automático porque el proveedor pudo haber aceptado el mensaje. Revisar Twilio y el historial antes de iniciar otra operación. No se descargan automáticamente adjuntos entrantes; aparecen como mensaje multimedia sin procesar archivos ni URLs externas.

Todos los pagos nuevos crean atómicamente dos trabajos en `payment_receipt_deliveries` (email y WhatsApp). La rutina `processPendingPaymentReceipts(admin, limit=25)` procesa pendientes con claims atómicos. No se encolan recibos históricos. Un fallo ambiguo queda `unknown`; un worker interrumpido después del claim conserva `sending` para conciliación manual. Los recibos de WhatsApp nuevos también aparecen en la bandeja. Los envíos antiguos/manuales de otros módulos conservan sus rutas y no se reconstruye su historial.

En **Mensajes → Recibos por revisar**, un administrador consulta `unknown` y los `sending` detenidos más de 15 minutos. Después de revisar el proveedor puede confirmar el envío con su referencia o cerrar sin reenviar. La resolución guarda actor, nota, estado anterior y resultado en una transacción; una pantalla desactualizada no puede sobrescribir un callback. No existe reintento automático ni se reinicia la cola a `pending`. Un nuevo envío manual solo debe hacerse después de comprobar que el proveedor no aceptó el original.

Todos los caminos de correo comprueban la respuesta de Resend: un `{error}` o ausencia de ID no registra éxito. WhatsApp sin configurar, con número inválido, rechazo o respuesta sin SID válido también falla explícitamente; ya no se registra como enviado un envío omitido.

Stripe confirma checkout y abono en una sola transacción. Errores de moneda, importe, saldo o una sesión antigua marcada pagada sin abono devuelven error de conciliación para que el proveedor reintente. Revisar esos casos antes de marcar nada manualmente; no se reconoce un pago sin ledger.

## Verificación local

- `node --test lib/whatsapp/security.test.mjs`: vector oficial y firmas/campos/URL/cuenta inválidos.
- `psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f lib/payments/transactions.test.sql`: fixtures con rollback, idempotencia, errores y ACL.
- `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/postgres node lib/payments/concurrency.test.mjs`: dos procesos concurrentes en base descartable; crea y limpia exclusivamente UUIDs fixture definidos.

Las pruebas no envían mensajes, cargos, ni consultan datos productivos. Aplicar primero todas las migraciones revisadas y configurar variables antes de activar cron/webhooks. El sandbox de Twilio y pruebas end-to-end de proveedor quedan pendientes de esa configuración.
