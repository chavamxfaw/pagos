# Chava Cervantes CRM — implementación local

Estado: 10 de septiembre de 2026 (Monterrey). Código implementado y probado localmente; **no desplegado ni aplicado a Supabase de producción**. Esta nota prevalece sobre el contexto histórico para los cambios nuevos.

## Producto implementado

- `/admin`: Hoy, próximas citas, tareas y actividad financiera real. Estados vacíos y fallos separados.
- `/admin/clients`: contactos existentes, búsqueda/exportación y ficha con pagos, seguimiento e historial de citas.
- `/admin/crm/opportunities`: oportunidades y conversión transaccional/idempotente de una oportunidad ganada a proyecto.
- `/admin/crm/projects`: proyectos, órdenes relacionadas y creación de órdenes precargadas.
- `/admin/crm/tasks`, `/proposals`, `/renewals`: tareas, propuestas y renovaciones con estados, fechas, contactos y relaciones. Son registros operativos; no un editor de contratos/PDF ni facturación automática de renovaciones.
- `/admin/calendar`: agenda, calendarios Google y tipos de reunión/enlaces. Varios calendarios por cuenta y varias cuentas; calendarios de solo lectura bloquean disponibilidad, pero no son destinos editables.
- `/book/[slug]`: reservas públicas por zona horaria, duración, anticipación, horizonte, días/horas y margen entre reuniones.
- `/book/manage/[token]`: cancelación por enlace privado; para otro horario se cancela y se crea una nueva reserva (no reprogramación atómica).
- `/admin/messages`: bandeja WhatsApp con vista previa, mensajes y enlaces de pago, bancos, documentos y reservas; estados reales de entrega.
- `/admin/reports`: dashboard financiero conservado.
- `/admin/platform`: inventario de negocios que usan/usarían el sistema, accesible solo al UUID de `PLATFORM_OWNER_USER_ID` que también esté autorizado como administrador.

Interfaz neutral, tipografía del sistema, azul como acento, navegación adaptable y estados accesibles. No se sustituyeron los pagos existentes por datos de muestra.

## Calendario: garantías y límites

Cada consulta pública usa Free/Busy vivo de todos los calendarios seleccionados, incluido el destino. Un evento ocupado de día completo bloquea el día; uno parcial bloquea su intervalo y el margen configurado. Los eventos transparentes/libres no bloquean. Si Google falla, no se ofrecen horarios basados en caché.

La reserva vuelve a comprobar disponibilidad, asocia el correo al contacto existente o crea uno nuevo y guarda la cita en una sola transacción. Una exclusión PostgreSQL y un bloqueo por propietario impiden reservas locales simultáneas superpuestas. La llave de idempotencia evita duplicar contacto/cita al reintentar. El calendario de destino se conserva en la reserva aunque después se edite el enlace.

Google recibe un ID determinista para evitar invitaciones duplicadas. Ante error se conserva el intervalo y se muestra sincronización pendiente; la recuperación busca primero el evento existente. La cancelación no libera el horario hasta verificar la eliminación remota. Se vuelven a comprobar ocupaciones externas antes de reintentar crear una cita.

La agenda consulta eventos externos al abrirse. Cambios de hora/cancelaciones de citas confirmadas se concilian al abrir la agenda y en el cron existente. No se instalaron notificaciones push de Google; no se promete sincronización instantánea en segundo plano. La conciliación está acotada a 200 citas confirmadas con fin desde ayer. Ediciones externas a día completo o conflictos entre reservas requieren revisión y muestran error de sincronización; no se desplaza otra cita silenciosamente. Free/Busy y crear un evento en Google no son una transacción: un cambio externo en ese intervalo sigue siendo una condición de carrera del proveedor.

La asociación al contacto usa el correo declarado, **no verifica identidad**. La UI lo advierte. No modifica datos del contacto existente ni concede acceso a sus pagos. El enlace de gestión es un secreto portador: compartirlo permite cancelar esa cita; no autentica al cliente en el CRM.

## Activación de Google

1. Crear/seleccionar proyecto Google Cloud y habilitar Calendar API.
2. Configurar consentimiento OAuth y un cliente de tipo aplicación web. En modo testing, autorizar tu cuenta como usuario de prueba; revisar las limitaciones de expiración de tokens antes de producción.
3. Registrar exactamente `https://pagos.sitios-dev.info/api/calendar/google/callback` (y un callback separado de preview/local si se prueba ahí).
4. Guardar como secretos del entorno `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CALENDAR_TOKEN_KEY` y definir `NEXT_PUBLIC_APP_URL`. `CALENDAR_TOKEN_KEY` debe ser una clave aleatoria de 32 bytes codificada en base64, generada y guardada de forma segura. No rotarla sin migrar los tokens cifrados o reconectar cuentas.
5. Entrar a Agenda → Calendarios → Conectar Google, autorizar cada cuenta y seleccionar qué calendarios bloquean. Crear el enlace y elegir un destino editable.
6. Probar con una cuenta de prueba: evento parcial, día completo, dos calendarios, reserva, reintento, cambio externo y cancelación. Aún no se han realizado estas pruebas con proveedor real.

OAuth usa state, PKCE y cookies HttpOnly; refresh tokens cifrados AES-256-GCM y sin lectura desde roles de navegador. Consultas de Free/Busy agrupadas hasta 50 calendarios conforme a [Google](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query). IDs de eventos según [Google Calendar](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

## WhatsApp y OpenClaw

Ver `lib/whatsapp/INTEGRATION.md` para plantillas, callbacks firmados y envío. No se enviaron mensajes reales durante el desarrollo.

Cambio de compatibilidad obligatorio: configurar `OTLA_AGENT_OWNER_ID` con tu UUID de Auth permitido. La API falla de forma cerrada si falta; `X-Agent-Name` ya no cambia la identidad. `PLATFORM_OWNER_USER_ID` puede ser el mismo UUID pero no extiende permisos de OpenClaw.

Endpoints nuevos, con el bearer existente:

- `GET /api/agent/crm?kind=tasks&client_id=UUID`: listar registros. Valores de kind: opportunities, projects, tasks, proposals, renewals.
- `POST /api/agent/crm`: crear/actualizar por `kind`, `id` opcional y campos permitidos del módulo. `action: convert_opportunity` y `opportunity_id` convierten una oportunidad ganada.
- `GET /api/agent/calendar`: próximas citas y enlaces del propietario.
- `POST /api/agent/calendar`: `event_type_id` y `date` opcional (YYYY-MM-DD) devuelven enlace/disponibilidad; **no envían mensajes**.
- `POST /api/agent/messages`: envío contextual validado; ver integración.
- `POST /api/agent/payments`: ahora requiere `Idempotency-Key` de 16–128 caracteres. Reutilizar exactamente la misma llave/payload para reintentos de una operación.

Pagos API y Stripe usan RPC transaccional: abono, saldo y estado no pueden quedar parcialmente aplicados. Outbox de recibos recuperable por canal; resultados ambiguos de envío no se reenvían a ciegas. El cron protegido existente también procesa recibos pendientes y recuperación de calendario; conserva su frecuencia diaria.

## Separación de cuentas

CRM y calendarios nuevos se filtran por propietario y tienen RLS; OpenClaw está ligado explícitamente a un dueño. **Clientes, órdenes y varios recursos históricos siguen siendo un negocio global.** No habilitar acceso de otros negocios ni agregar sus usuarios a `app_admin_users`. El apartado Plataforma es inventario, no provisionamiento, suscripciones SaaS ni aislamiento multi-tenant completo. La migración transversal de datos históricos/roles/Storage es una siguiente fase antes de vender acceso al sistema.

## Validación y publicación pendiente

- Build Next 16.3.4 y TypeScript correctos; lint sin errores (3 advertencias de navegación heredada). La última compilación usa `npx next build --webpack`: Turbopack encontró una restricción local al abrir su puerto temporal de CSS, incluso al reintentar con escalación. No se cambió el comando de producción por ese problema del entorno.
- 15 pruebas unitarias: disponibilidad/zonas horarias, validadores CRM, firmas de WhatsApp, límites de cuerpos HTTP y carga sin Resend configurado.
- SQL en PostgreSQL aislado: RLS/roles, relaciones, conversión, transacciones, idempotencia y snapshot del calendario.
- Concurrencia real con procesos PostgreSQL independientes: no dobles reservas/contactos ni pagos sobre saldo.
- 10 comprobaciones visuales SSR a 1440/390: agenda, enlaces, calendarios, reserva y mensajes. Fixtures con stubs fuera del repo: **no sustituyen QA autenticado/hidratado**.
- `npm audit --omit=dev`: 0 vulnerabilidades conocidas al validar; auditoría total mantiene 11 alertas de herramientas de desarrollo.
- Build advierte que Supabase local configurado no está disponible para leer Stripe; no fue una validación contra producción.

Validación local autenticada posterior: 22/22 rutas administrativas HTTP 200 sin errores RSC; build aislado correcto (39 páginas); 45 comprobaciones de Auth/Data API/RLS, relaciones y concurrencia aprobadas. En navegador se creó contacto, proyecto, orden y abono ficticio, verificando saldo y dashboard; menú móvil y vistas Hoy/pagos comprobados a 390 px sin desbordamiento. Ver `UI_QA.md`.

Antes de publicar: respaldo fresco/restauración de ensayo, revisión de drift remoto, aplicar las ocho migraciones nuevas en orden a staging, configurar variables de propietario y Google/Twilio, validar Auth/Data API/RLS y flujos con proveedores, después publicar código coordinado con esquema. No hacer `db push` indiscriminado ni reparar historial automáticamente. Las migraciones nuevas solo se aplicaron a entornos locales, incluida la instancia Supabase `pagos-crm-local`.

Comandos de pruebas puras: `node --test lib/calendar/availability.test.mjs lib/crm/model.test.mjs lib/whatsapp/security.test.mjs`. Las pruebas de concurrencia exigen una base desechable localhost:55439 y nunca deben redirigirse a producción; pagos requiere además `TEST_DATABASE_URL` de esa base.
