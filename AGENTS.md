# AGENTS.md — Reglas Operativas para Agentes de Desarrollo (EmprendeBúho)

Este archivo define las reglas obligatorias para cualquier agente o desarrollador que construya o modifique código en **EmprendeBúho**. Léelo completo antes de tocar cualquier archivo del repositorio.

---

## 1. Jerarquía de Fuentes de Verdad

1. **[`especificacion_tecnica_emprendebuho.md`](especificacion_tecnica_emprendebuho.md) (v2.0):** contrato maestro de producto, base de datos, API REST, rutas de interfaz y criterios de aceptación.
2. **[`docs/especificacion-arquitectura.md`](docs/especificacion-arquitectura.md) y [`docs/especificacion-base-de-datos.md`](docs/especificacion-base-de-datos.md):** especificaciones formales de arquitectura (C4, 4+1 vistas, diagramas de secuencia) y de base de datos relacional (diccionario de datos de las 11 tablas, restricciones, índices con `EXPLAIN QUERY PLAN` y transacciones), junto con el DDL oficial en [`backend/database/schema.sql`](backend/database/schema.sql).
3. **[`docs/plan-de-construccion.md`](docs/plan-de-construccion.md):** división por fases, propiedad de archivos por agente, matriz de trazabilidad de las 40 Historias de Usuario y plantillas de prompts.
4. **[`docs/decisiones-tecnicas.md`](docs/decisiones-tecnicas.md):** registro de decisiones arquitectónicas (ADR) y justificación de los cambios respecto a la v1.

> **Regla de oro:** Si encuentras una contradicción entre el código y `especificacion_tecnica_emprendebuho.md`, **manda la especificación**. Si necesitas cambiar un endpoint, campo o regla técnica, actualiza primero la especificación y registra la decisión en `docs/decisiones-tecnicas.md` en el mismo commit.

---

## 2. Prohibiciones Estrictas (Fuera de Alcance y Seguridad)

1. **Sin pagos ni carritos de compra:** prohibido agregar carritos transaccionales, pasarelas de pago (Stripe, PayPal, MercadoPago, tarjetas) o saldos (§1.2).
2. **Sin logística de envíos ni repartidores:** el acuerdo de entrega ocurre por contacto directo entre consumidor y emprendedor (§1.2).
3. **Privacidad estricta de ubicación (`RNF-06` y `HU-12`):** cuando `businesses.mostrar_ubicacion = 0`, está prohibido exponer `campus_zone_id`, `zona_codigo`, `zona_nombre` o `ubicacion_detalle` en cualquier endpoint público (`GET /api/businesses`, `GET /api/businesses/:slug`, `GET /api/products`, `GET /api/my-business/preview`). Todo negocio público debe pasar por `sanitizePublicBusiness()`.
4. **Privacidad estricta de credenciales estudiantiles:** las fotos de credenciales UNISON se guardan en `backend/storage/credentials/` (**nunca** dentro de `backend/uploads/`) y jamás se sirven como archivos estáticos. Solo se entregan mediante `GET /api/admin/requests/:userId/credential` verificando `requireAuth` + `requireRole('admin')`.
5. **Manejo de errores claros (`RNF-05`):** prohibido devolver al cliente trazas de pila (*stack traces*), errores crudos de SQLite (`SQLITE_CONSTRAINT_*`) o mensajes en inglés. Todo error pasa por `error.middleware.js` y devuelve el sobre estándar con un código del catálogo cerrado (§5.0.2).
6. **Contraste visual UNISON (`RNF-04`):** prohibido usar el dorado `#F2A900` como color de texto sobre fondo blanco o claro (contraste `1.9:1`, ilegible). El dorado se usa como fondo con texto azul marino `#002D62`.
7. **Dependencias cerradas (§2.1.1):** no instales paquetes fuera de la lista autorizada en la especificación sin documentar antes el motivo en `docs/decisiones-tecnicas.md`. No uses ORMs (Prisma, Sequelize, TypeORM, Knex) ni TypeScript.

---

## 3. Convenciones de Código y Arquitectura

### 3.1 Nombres e Idioma
* **Base de datos y JSON de la API:** `snake_case` en español, respetando al pie de la letra los nombres de columnas de `schema.sql` (`nombre_negocio`, `esta_abierto`, `mostrar_ubicacion`, `estado_cuenta`, `campus_zone_id`, `en_horario_ahora`).
* **Código JavaScript/JSX (variables, funciones, archivos):** `camelCase` para funciones y variables, `PascalCase` para componentes React.
* **Textos visibles al usuario y mensajes de error:** 100 % en español de México (`es-MX`), claros y accionables.
* **Moneda y zona horaria:** precios formateados en `MXN` (`$35.00`); comparaciones de horario de atención calculadas en el backend sobre `America/Hermosillo` (UTC-7 fijo, sin horario de verano).

### 3.2Separación de Capas en el Backend (`backend/src/`)
* `routes/*.routes.js`: declara rutas y encadena middlewares (`rateLimit`, `requireAuth`, `requireRole`, `upload`, `validate`, controlador).
* `controllers/*.controller.js`: extrae datos ya validados de `req`, llama al servicio y responde con `ok(res, data, message, meta)`. **Prohibido escribir SQL en controladores.**
* `services/*.service.js`: implementa las reglas de negocio, coordina transacciones con `db.transaction(...)`, invoca `touchActivity(businessId)` en cada mutación del emprendedor, emite notificaciones y escribe en `audit_logs` en cada acción de administrador.
* `repositories/*.repository.js`: contiene **todas** las consultas SQL preparadas con parámetros nombrados (`:param`). Prohibido concatenar cadenas de usuario en SQL (incluyendo `ORDER BY`, que debe salir de `SORT_CLAUSES`).

### 3.3 Estándares del Frontend (`frontend/src/`)
* **Mobile-First (`RNF-02`):** diseña primero para `360px–430px` de ancho con `BottomNav.jsx` fijo y objetivos táctiles de al menos `44x44 px`; escala a escritorio (`md:` `>= 768px`) con `Navbar.jsx` superior y `AdminSidebar.jsx`.
* **Máximo 2 clics al contacto (`RNF-01`):** desde `/` un clic abre `/negocio/:slug` y los botones de WhatsApp / Llamada / Redes están visibles sin desplazarse ni abrir submenús.
* **Vista previa fiel (`HU-34`):** `BusinessDetailPage.jsx` y `ProfilePreviewPage.jsx` deben renderizar exactamente el mismo componente de presentación `BusinessProfileView.jsx`.

---

## 4. Comandos Estándar de Trabajo

Ejecutar siempre desde la raíz del repositorio (`emprendebuho/`):

| Comando | Propósito |
| ----- | ----- |
| `npm install` | Instala dependencias de raíz, `backend` y `frontend` (npm workspaces). |
| `npm run dev` | Levanta en paralelo el backend (`http://localhost:4000`) y el frontend (`http://localhost:5173`). |
| `npm test` | Ejecuta la suite de pruebas de integración del backend (`node --test`). |
| `npm run build` | Compila el bundle de producción del frontend con Vite para verificar que no hay errores de importación ni sintaxis. |
| `npm run lint` | Ejecuta ESLint sobre `frontend/src`. |
| `npm run db:reset` | Recrea desde cero `emprendebuho.sqlite` con `schema.sql` y `seed.js`. |

---

## 5. Flujo de Trabajo y Definition of Done por Fase

1. **Antes de codificar una fase:** lee la sección correspondiente en [`docs/plan-de-construccion.md`](docs/plan-de-construccion.md) y verifica qué archivos te pertenecen. Si trabajas en paralelo con otros agentes, **no modifiques archivos fuera de tu ámbito asignado**.
2. **Al terminar tu tarea:**
   * Corre `npm test` (si tocaste `backend/`) y `npm run build` (si tocaste `frontend/`).
   * Verifica cada casilla del checklist de aceptación de tu fase en `docs/plan-de-construccion.md`.
   * Realiza un commit atómico con el mensaje indicado en el plan de construcción.
