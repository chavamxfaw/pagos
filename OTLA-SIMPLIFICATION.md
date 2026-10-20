# OTLA simplificado — 19 octubre 2026

Objetivo: gestionar cobros y relaciones con clientes, sin un gestor de ventas o proyectos.

## Estructura

Inicio → Pagos → Contactos (CRM) → Agenda → Comunicación.
Los ajustes conservan datos bancarios, documentos fiscales, Stripe y perfil/notificaciones.

- Se retiraron de la navegación Ventas, Proyectos, Propuestas, Renovaciones y Plataforma.
- No se eliminaron registros, tablas, APIs ni rutas históricas. Esta entrega simplifica la interfaz; no revoca permisos ni destruye información.
- Las fichas de contacto conservan notas, seguimientos, citas y cobros.
- Se ocultó el selector de proyectos en los cobros conservando las relaciones válidas existentes.
- Inicio muestra cobros, citas, seguimientos y próximas fechas de recordatorio configuradas, sin presentar esas fechas como entregas confirmadas.

## Recordatorios

La configuración actual admite un aviso por orden, de 0 a 30 días antes del vencimiento. Ahora se puede introducir cualquier entero del intervalo, no solo los valores predefinidos anteriores, y consultar la fecha prevista antes de guardar.

La ejecución existente revisa los avisos diariamente a las 14:00 UTC (08:00 Monterrey). No se cambió el cron ni se activaron avisos existentes. Se conservan los canales de cada orden.

Pendiente de una ampliación del programador: múltiples avisos, fechas posteriores al vencimiento, repetición y horarios individuales. No presentar estas funciones como disponibles.

## Criterios visuales

Impeccable, modo Operate/distill: preservar OTLA y el estilo claro, reducir tarjetas y accesos secundarios; usar listas, separadores y azul discreto. Mantener menú plegable y móvil.

## Verificación

Lint y TypeScript: sin errores. Pruebas de fechas: límites de mes/año, año bisiesto, fecha inválida e intervalos fuera de rango.
Revisión visual y de interacción: entorno aislado en localhost:3002, proveedores reales deshabilitados.
Escritorio y móvil de 390 px revisados; sin desbordamiento horizontal ni errores de consola en Inicio. Menú móvil abierto y cerrado correctamente. Configuración de cuatro días guardada y comprobada en el cobro ficticio local con correo y WhatsApp apagados.
El escaneo heurístico de componentes no detectó marcadores de vacío y envío en curso: los vacíos se verificaron en Inicio y el formulario conserva `pending` y deshabilitado. No es una auditoría exhaustiva de todos los estados.
El script de smoke visual se sustituyó por la revisión en el navegador autorizado. No se ejecutó un build de producción en esta iteración.
No publicado en producción en esta entrega. No hubo cargos ni mensajes reales.
