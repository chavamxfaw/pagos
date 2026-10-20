# Refinamiento visual — 19 octubre 2026

Objetivo: reforzar la navegación y facilitar revisar cobros sin recuperar los módulos retirados del menú.

## Referencias

- https://linear.app/now/behind-the-latest-design-refresh — jerarquía, navegación y acciones consistentes.
- https://ui.shadcn.com/blocks/sidebar — composición de navegación.
- https://ui.shadcn.com/docs/components/base/badge — indicadores de estado.

Impeccable guio la concentración del color en una sola región. Se reutilizaron Button variants, Badge y Separator del proyecto, sin instalar dependencias. La consulta del CLI a shadcn falló por DNS; se consultó la documentación oficial por web.

## Cambios

- Paleta azul tinta acotada a `.otla-navigation`, escritorio y móvil.
- Logo y cinco destinos principales conservados, incluido el control de contraer.
- Resumen financiero compacto, indicador de cobros por revisar y acciones rápidas.
- Cobros primero en el DOM y visualmente; agenda y avisos en columna secundaria.
- Estados de cobro escritos, no dependientes del color.
- Sin cambios a credenciales, proveedores, consultas, envíos ni despliegues.

## Validación

- Lint, TypeScript y diff sin errores.
- Navegación móvil, contraer/expandir y estados vacíos revisados en navegador local.
- Sin desbordamiento horizontal a 390 px y 1750 px.
- Contraste de texto secundario: 7.11:1 sobre sidebar, 4.75:1 sobre hover; selección blanca: 7.49:1.
- El escáner heurístico de componentes no detecta `empty` ni `submitting`: los vacíos del inicio se revisaron en el navegador; no se modifican formularios ni se realizan envíos en esta pasada.
- Estados de fallo/carga existentes conservados; no se simularon fallos de red ni cobros reales.

Pendiente: aprobación visual del usuario y cualquier publicación posterior. No constituye auditoría integral de todos los módulos.
