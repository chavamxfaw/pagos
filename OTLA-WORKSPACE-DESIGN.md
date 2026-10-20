# OTLA — login ilustrado y espacio de pagos

## Direction contract

THESIS: pagos primero, con navegación estable y contexto lateral opcional; no es una aplicación de proyectos ni una portada comercial.

OWN-WORLD: superficies blancas, navegación gris verdosa, selección salvia, pendientes ámbar y vencimientos coral. Logo OTLA existente. Tipografía de sistema legible.

STORY: acceder, revisar cobros, abrir un pago y consultar citas o recordatorios sin perder el contexto.

FIRST VIEWPORT: navegación izquierda, cobros en el centro, Resumen/Actividad a la derecha con control visible para ocultar. Login con formulario izquierdo e ilustración de pagos derecha; en móvil el formulario tiene prioridad.

FORM: referencia elegida explícitamente por el usuario; implementación code-led. Sin sorteo de dirección ni mockup adicional.

FINISH: revisión visual independiente, documentación de tokens y pruebas locales; no implica publicación.

## Alcance y límites

- Sidebar clara en el área administrativa.
- Panel derecho y filtros nuevos en Inicio. No se han añadido paneles contextuales a cada ficha.
- Actividad muestra seguimientos existentes, no inventa un historial completo.
- Panel ocultable durante la visita; no ajuste de ancho ni persistencia entre recargas.
- Se reutilizó Base UI Tabs instalado, sin dependencias nuevas.
- Login y raíz conservan el mecanismo de autenticación.
- No se cambiaron consultas, RLS, proveedores, envíos, cobros ni credenciales.
- Datos de captura: entorno local de pruebas, no clientes reales.

## Ilustración

Archivo: `public/otla-payments-illustration.png`

Origen: herramienta integrada de generación de imágenes, 19 octubre 2026.

Prompt:

> Create an original polished editorial illustration asset for OTLA, a personal payment collection and client management web app login. Square composition on an entirely solid very pale mint background #F4F8F3. A relaxed small business owner with dark hair sitting at a clean desk, using a laptop to organize payments. Three carefully arranged oversized symbolic paper objects nearby: a receipt with a large teal checkmark, a small calendar with one softly highlighted due date, and a payment card. Contemporary refined flat vector-like editorial illustration, confident clean black outlines, restrained soft sage green and turquoise fills, touches of OTLA cobalt blue, plentiful negative space, organic human proportions, professional but warm. No actual words, letters, amounts, logos, UI text or watermarks. No charts, no dollar rain, no fake dashboard screenshot, no gradients, no 3D. This is only the illustration artwork, not a complete login screen. Keep all artwork comfortably inside the frame with generous blank edges. It will be used in the right panel next to a real login form.

## Verificación

- Lint, TypeScript y diff: sin errores.
- Pestañas de cobros y Resumen/Actividad: probadas en navegador.
- Ocultar/mostrar contexto: probado.
- Login y dashboard a 390 px: sin desbordamiento horizontal.
- No se hicieron envíos ni pagos reales.
- Pendiente de aprobación visual y despliegue por separado.
