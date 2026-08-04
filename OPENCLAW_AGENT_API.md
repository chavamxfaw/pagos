# OTLA Agent API para OpenClaw

Esta API privada permite que OpenClaw consulte y registre informacion basica en OTLA Pagos desde Telegram u otro flujo automatizado.

## Base URL

```txt
https://pagos.sitios-dev.info/api/agent
```

## Autenticacion

Todas las peticiones deben incluir:

```http
Authorization: Bearer TU_OTLA_AGENT_API_KEY
```

Header opcional recomendado para identificar el origen:

```http
X-Agent-Name: openclaw
```

Headers recomendados:

```http
Content-Type: application/json
Authorization: Bearer TU_OTLA_AGENT_API_KEY
X-Agent-Name: openclaw
```

Importante: guarda `TU_OTLA_AGENT_API_KEY` como secreto en OpenClaw. No lo pegues en prompts, logs visibles ni repositorios.

## Respuestas de Seguridad

Sin token o con token incorrecto:

```http
401 Unauthorized
```

Si la llave no esta configurada en el servidor:

```http
500 Agent API key is not configured
```

La API tiene rate limit separado con scope `agent_api`.

## Endpoints

### Obtener resumen

```http
GET /summary
```

Devuelve totales generales, numero de ordenes pendientes y una lista resumida de ordenes pendientes.

Ejemplo:

```bash
curl -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  https://pagos.sitios-dev.info/api/agent/summary
```

Respuesta ejemplo:

```json
{
  "totals": {
    "total": 197484,
    "paid": 90129,
    "pending": 107355
  },
  "pending_order_count": 10,
  "pending_orders": []
}
```

### Listar clientes

```http
GET /clients
```

Query params opcionales:

```txt
search=texto
```

Ejemplo:

```bash
curl -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  "https://pagos.sitios-dev.info/api/agent/clients?search=salvador"
```

### Crear cliente

```http
POST /clients
```

Body:

```json
{
  "name": "Nombre Cliente",
  "email": "cliente@email.com",
  "phone": "8112345678",
  "company": "Empresa",
  "rfc": "RFC010101XXX",
  "address": "Direccion",
  "notes": "Notas internas"
}
```

Campos:

| Campo | Requerido | Descripcion |
| --- | --- | --- |
| `name` | Si | Nombre del cliente |
| `email` | No | Correo del cliente |
| `phone` | No | Telefono del cliente |
| `company` | No | Empresa o razon social |
| `rfc` | No | RFC |
| `address` | No | Direccion |
| `notes` | No | Notas internas |

Ejemplo:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  -d '{
    "name": "Cliente Demo",
    "email": "cliente@example.com",
    "phone": "8112345678",
    "company": "Demo SA de CV"
  }' \
  https://pagos.sitios-dev.info/api/agent/clients
```

### Listar ordenes

```http
GET /orders
```

Query params opcionales:

```txt
status=pending
client_id=uuid-del-cliente
search=texto
```

Ejemplos:

```bash
curl -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  "https://pagos.sitios-dev.info/api/agent/orders?status=partial"
```

```bash
curl -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  "https://pagos.sitios-dev.info/api/agent/orders?search=web"
```

### Crear orden

```http
POST /orders
```

Body:

```json
{
  "client_id": "uuid-del-cliente",
  "concept": "Sitio web",
  "total_amount": 12000,
  "issue_date": "2026-07-29",
  "due_date": "2026-08-10",
  "description": "Descripcion de la orden",
  "category": "service",
  "tags": ["web", "urgente"],
  "requires_invoice": false,
  "tax_mode": "none"
}
```

Campos:

| Campo | Requerido | Descripcion |
| --- | --- | --- |
| `client_id` | Si | ID del cliente |
| `concept` | Si | Concepto de la orden |
| `total_amount` | Si | Total de la orden en MXN |
| `issue_date` | No | Fecha de emision, formato `YYYY-MM-DD` |
| `due_date` | No | Fecha limite de pago, formato `YYYY-MM-DD` |
| `description` | No | Descripcion interna |
| `category` | No | Categoria de la orden |
| `tags` | No | Lista de tags |
| `requires_invoice` | No | Si requiere factura |
| `tax_mode` | No | Tratamiento de IVA |

Valores validos:

```txt
category: service | product | subscription | other
tax_mode: none | included | added
```

Ejemplo:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  -d '{
    "client_id": "uuid-del-cliente",
    "concept": "Sitio web",
    "total_amount": 12000,
    "category": "service",
    "tags": ["web"]
  }' \
  https://pagos.sitios-dev.info/api/agent/orders
```

### Agregar abono

```http
POST /payments
```

Body:

```json
{
  "order_id": "uuid-de-la-orden",
  "amount": 2500,
  "method": "transfer",
  "payment_date": "2026-07-29",
  "notes": "Abono recibido por transferencia"
}
```

Campos:

| Campo | Requerido | Descripcion |
| --- | --- | --- |
| `order_id` | Si | ID de la orden |
| `amount` | Si | Monto del abono en MXN |
| `method` | No | Metodo de pago |
| `payment_date` | No | Fecha del abono, formato `YYYY-MM-DD` |
| `notes` | No | Notas del abono |

Valores validos para `method`:

```txt
cash
transfer
card
stripe
other
```

El endpoint valida que el abono no exceda el saldo pendiente. Si el cliente tiene correo o telefono, se disparan las notificaciones normales del sistema.

Ejemplo:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_OTLA_AGENT_API_KEY" \
  -H "X-Agent-Name: openclaw" \
  -d '{
    "order_id": "uuid-de-la-orden",
    "amount": 2500,
    "method": "transfer",
    "payment_date": "2026-07-29",
    "notes": "Abono recibido por transferencia"
  }' \
  https://pagos.sitios-dev.info/api/agent/payments
```

## Operaciones No Disponibles

Por seguridad, esta API no incluye endpoints para:

- Borrar clientes.
- Borrar ordenes.
- Borrar abonos.
- Modificar configuracion del sistema.
- Consultar secretos o variables de entorno.

## Recomendaciones para OpenClaw

- Guardar `OTLA_AGENT_API_KEY` como secreto.
- Usar `X-Agent-Name: openclaw` en todas las llamadas.
- Antes de crear una orden, buscar el cliente por nombre/correo.
- Antes de agregar un abono, buscar la orden y validar saldo pendiente.
- No registrar abonos sin confirmacion explicita del usuario final.
- Mostrar resumen de lo que se va a crear antes de hacer `POST`.
