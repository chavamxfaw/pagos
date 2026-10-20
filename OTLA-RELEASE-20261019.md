# OTLA: simplificación y diseño

## Alcance

Login como portada, navegación de pagos/contactos/agenda/comunicación, inicio con
panel contextual ocultable, colores compartidos del panel, indicadores de categoría
y selección de recordatorio entre 0 y 30 días antes del vencimiento.
No modifica migraciones, credenciales, proveedores, webhooks ni políticas de acceso.
Ventas y proyectos se ocultan de la navegación; sus datos y rutas se conservan.
La nueva distribución contextual aplica al inicio, no a todas las pantallas.
Los enlaces públicos de pagos conservan su diseño previo.

## Verificación

- Lint, TypeScript, compilación de producción y revisión de whitespace aprobados.
- 41 pruebas de unidad/contratos aprobadas: recordatorios, calendario, checkout
  simulado, firmas de WhatsApp, entregas simuladas, identidad, límites de petición,
  noindex y páginas públicas.
- 12 pruebas de denegación de permisos aprobadas en contenedor local aislado.
- La prueba de portada se actualizó al requisito de mostrar login, manteniendo
  la comprobación de acceso sin sesión y los enlaces legales.
- Inspección de límites servidor/cliente y validación existente de recordatorios.
- Búsqueda básica de patrones de claves privadas en textos modificados sin hallazgos.
- Validación visual local previa en escritorio y móvil, navegación y pestañas.

Sistema de nivel C por su función de cobros. Esta revisión es incremental y no
certifica toda la aplicación: no se realizaron cobros, mensajes reales, auditoría
completa de dependencias, pruebas nuevas de concurrencia en producción ni conexión
OAuth de un usuario real. La compilación local emitió una advertencia de tabla
stripe_settings no disponible; no se interpretó como prueba del estado productivo.

## Publicación y recuperación

Publicar con las variables existentes del proyecto Vercel pagos; excluir .env,
respaldos e informes privados. No requiere mantenimiento de base de datos.
Ante regresión, restaurar el despliegue anterior desde Vercel sin revertir datos.
Este documento registra preparación, no confirma por sí mismo un despliegue exitoso.
