# Bitácora de Decisiones Técnicas (ADR) — EmprendeBúho (v1.0 → v2.0)

Este documento registra todas las decisiones técnicas tomadas durante la revisión de `especificacion_tecnica_emprendebuho.md` para pasar de la versión 1.0 a la versión 2.0.

> **Principio rector:** La especificación del **producto** (§1 Contexto y alcance, §3.1 Requerimientos Funcionales, §3.2 Requerimientos No Funcionales y las columnas de producto de §3.3) se mantuvo **intacta**. Todos los cambios aquí documentados resuelven contradicciones internas, errores de SQL/seguridad o huecos de contrato técnico para que los agentes construyan sin ambigüedad.

---

## 1. Decisiones de Producto/Dominio Confirmadas con el Autor

| ID | Decisión | Justificación |
| ----- | ----- | ----- |
| **D-01** | **Acreditación UNISON estricta en el registro (`HU-01`):** correo `@unison.mx` obligatorio + matrícula de 9 dígitos obligatoria + foto de credencial escolar obligatoria. | Asegura que el administrador tenga todos los elementos de verificación en `HU-20B/21` y permite usar `(email_institucional, matricula_unison)` como par verificador en consultas de estatus (`HU-27`). |
| **D-02** | **Indicador Abierto/Cerrado 100 % manual (`HU-17`) + bandera informativa `en_horario_ahora`:** no se apaga con un cron por horario; la API devuelve `en_horario_ahora` calculado en `America/Hermosillo` y la tarjeta muestra *"Fuera de su horario habitual"* cuando `esta_abierto = true` y `en_horario_ahora = false`. | Respeta literalmente `HU-17` (interruptor manual en tiempo real) sin ocultar al consumidor si un vendedor olvidó apagar su interruptor. |
| **D-03** | **Imagen obligatoria al crear producto (`HU-02`) y opcional al editar (`HU-08`).** | Cumple literalmente *"una imagen y descripción por producto"* de `HU-02` sin obligar a resubir la imagen cada vez que se cambia el precio o la descripción. |
| **D-04** | **Stack en versiones estables actuales:** Node.js 22/24 LTS, Express 5, React 19, `react-router` v7 (modo declarativo), Tailwind CSS v4 (`@tailwindcss/vite`) y `zod` v4. | Express 5 elimina wrappers de errores asíncronos, Tailwind v4 simplifica la configuración a `@theme` en `index.css` y `better-sqlite3` cuenta con binarios precompilados en Node LTS. |

---

## 2. Unificación de Endpoints Contradictorios (Sección 3.3 vs. Sección 5)

En la v1, la tabla de Historias de Usuario (§3.3) y las tablas de la API (§5) nombraban de forma distinta 9 operaciones. Se unificaron así:

| # | Conflicto en v1 | Contrato único en v2 |
| ----- | ----- | ----- |
| **A1** | `PUT /api/my-business/menu-photo` y `PUT .../profile-photo` (§3.3) vs `PUT /api/my-business/photos` (§5.3) | `PUT /api/my-business/photos` (`foto_perfil` y/o `foto_menu`) + `DELETE /api/my-business/photos/:tipo` (`perfil \| menu`). |
| **A2** | `PATCH /api/my-business/products/:id/status` (§3.3) vs `PATCH .../pause` con toggle (§5.3) | `PATCH /api/my-business/products/:id/status` recibiendo `{ "estado": "activo" \| "pausado" }` (idempotente ante doble clic). |
| **A3** | `PATCH /api/my-business/location-visibility` (§3.3) vs `PUT /api/my-business/location` (§5.3) | `PATCH /api/my-business/location` parcial: acepta `{ mostrar_ubicacion }`, `{ campus_zone_id, ubicacion_detalle }` o ambos. |
| **A4** | `DELETE /api/my-account` (§3.3) vs `DELETE /api/auth/my-account` (§5.2) | `DELETE /api/auth/my-account`. |
| **A5** | `GET /api/auth/request-status?identifier=` (§3.3) vs `?email=` (§5.2) | `POST /api/auth/request-status` con `{ email_institucional, matricula_unison }`. |
| **A6** | `GET /api/catalogs/categories` (§3.3) vs `GET /api/catalogs` (§5.1) | `GET /api/catalogs` (devuelve `{ categories, campus_zones }`). |
| **A7** | `PATCH /api/admin/categories/:id` en §3.3 vs solo `POST`/`PUT` en §5.4 | `GET`, `POST` y `PUT /api/admin/categories/:id` (incluye `activa`). |
| **A8** | `users.last_active_at` vs `businesses.last_activity_at` | `businesses.last_activity_at` para actividad del negocio e inactividad; `users.last_login_at` para el último inicio de sesión. |
| **A9** | `database/seed.sql` en el árbol (§2.2) vs generar hashes con `bcryptjs` al sembrar (§7) | `backend/database/seed.js` ejecutado por Node en una transacción. |

---

## 3. Corrección de Defectos Técnicos y de Seguridad (Serie B)

| # | Defecto en v1 | Corrección en v2 |
| ----- | ----- | ----- |
| **B1** | Error tipográfico `descripcionbuildings` en `campus_zones`. | Renombrado a `descripcion`. |
| **B2** | **Bug lógico en filtro de precio (`HU-33`):** la consulta de §5.1 usaba dos `EXISTS` separados (`precio >= :min` y `precio <= :max`). Un negocio con un sticker de `$5` y un termo de `$600` aparecía al filtrar `$100–$200`. | Unificado en un solo `EXISTS` que verifica que **el mismo producto activo** cumpla `p.precio >= COALESCE(:min_price, 0) AND p.precio <= COALESCE(:max_price, 99999.99)`. |
| **B3** | **Búsqueda "insensible a acentos" con `LIKE` nativo (`HU-15`, `HU-37`):** en SQLite, `LIKE` y `COLLATE NOCASE` solo cubren ASCII (`"buho"` no encontraba `"Búho"`). Además no se escapaban `%` ni `_`. | Registro de función SQL determinista `normalizar(texto)` con `db.function()` en `better-sqlite3` (`NFD` + remoción de marcas diacríticas + `toLowerCase()`) y `ESCAPE '\'` sobre la entrada del usuario. |
| **B4** | **Tablas Markdown rotas en §5.3:** los caracteres `\|` dentro de `` `{ "esta_abierto": true \| false }` `` partieron la fila y truncaron la especificación de `open-status` y `location`. | Se reemplazaron las tablas truncadas por fichas estructuradas por endpoint con bloques JSON completos. |
| **B5** | **Condición de borde en horario (`HU-38`):** `hora_cierre >= :time` consideraba abierto a un negocio exactamente en su minuto de cierre (`14:00` en un horario `08:00–14:00`). | Intervalo semiabierto `[hora_apertura, hora_cierre)`: `hora_apertura <= :time AND :time < hora_cierre`. |
| **B6** | **Fuga de datos personales en credenciales (`HU-01`, `HU-20B`):** guardar las credenciales estudiantiles en `backend/uploads/credentials/` y montar `express.static('uploads')` hacía públicas todas las credenciales de alumnos UNISON. | Las credenciales se guardan fuera de `uploads/`, en `backend/storage/credentials/` (`users.credencial_path`), y solo se sirven en `GET /api/admin/requests/:userId/credential` tras verificar `requireAuth` + `requireRole('admin')`. |
| **B7** | **`mostrar_ubicacion DEFAULT 1`:** hacía pública la ubicación por defecto y permitía `mostrar_ubicacion = 1` con `campus_zone_id = NULL`. | `mostrar_ubicacion DEFAULT 0` + restricción `CHECK (mostrar_ubicacion = 0 OR campus_zone_id IS NOT NULL)`. |
| **B8** | **Código de recuperación de 6 dígitos en texto plano y sin límite de intentos (`HU-32`).** | Se almacena `codigo_hash` (SHA-256) y columna `intentos` (`CHECK (intentos BETWEEN 0 AND 5)`), invalidando el código al quinto fallo. |
| **B9** | `express-rate-limit` requerido en `HU-26` pero ausente en `package.json`. | Añadido a las dependencias de producción del backend (§2.1.1). |
| **B10** | `backend/.env` listado como archivo del repositorio. | Se versiona `backend/.env.example` y `.env` queda ignorado en `.gitignore`. |
| **B11** | Columna huérfana `businesses.es_destacado` sin ninguna Historia de Usuario ni endpoint que la gestione. | Eliminada del esquema para evitar código muerto. |
| **B12** | Bloques de código sin etiqueta de lenguaje e índices redundantes. | Etiquetas `sql`, `js`, `json`, `css`, `env` en todos los bloques y ajuste de índices a las consultas reales. |

---

## 4. Contratos Completados para Evitar Invenciones de los Agentes (Serie C)

| # | Hueco en v1 | Definición en v2 |
| ----- | ----- | ----- |
| **C1** | Faltaban endpoints para restaurar sesión, leer notificaciones, vista previa, moderación listada, estadísticas y descarga de respaldos. | Especificados en §5.2 (`GET /api/auth/me`, `/api/notifications/*`), §5.3 (`GET /api/my-business/preview`) y §5.4 (`GET /api/admin/stats`, `GET /api/admin/products`, `GET /api/admin/categories`, `GET /api/admin/maintenance/health`, `GET .../backups/:filename`, `POST .../cleanup-orphans`, `GET /api/admin/audit-logs`). |
| **C2** | Comportamiento exacto del login para cuentas no aprobadas (`HU-40`). | Verificación de contraseña primero; respuestas `403` tipificadas (`ACCOUNT_PENDING`, `ACCOUNT_REJECTED`, `ACCOUNT_SUSPENDED`) con motivo y sin emitir JWT; `eliminada` responde `401 INVALID_CREDENTIALS`. |
| **C3** | Revocación inmediata de JWT al suspender (`HU-22`), eliminar cuenta (`HU-28`) o cambiar contraseña (`HU-32`). | Columna `users.token_version` incluida en el JWT (`tv`) y verificada en `requireAuth` en cada petición. |
| **C4** | Re-solicitud de cuenta tras rechazo (`HU-21`) o baja (`HU-28`) cuando `email_institucional` y `matricula_unison` son `UNIQUE`. | `POST /api/auth/register-request` reutiliza la fila si su estado es `'rechazada'` o `'eliminada'` y la devuelve a `'pendiente'`. |
| **C5** | Duración de la suspensión temporal (`HU-22`). | Columna opcional `users.suspendida_hasta` y reactivación automática al vencer tanto en `requireAuth` como en el barrido de mantenimiento. |
| **C6** | Privacidad de `request-status` (`HU-27`). | Cambiado a `POST /api/auth/request-status` exigiendo correo y matrícula simultáneamente. |
| **C7** | Edición de un producto en `'oculto_admin'` (`HU-08`, `HU-20A`). | El emprendedor puede editarlo para corregir la falta, pero el estado permanece en `'oculto_admin'` hasta que el administrador lo restaure; la bandera `editado_tras_moderacion` (`updated_at > moderado_at`) avisa al admin. |
| **C8** | Ordenamiento por cercanía (`HU-30`) y mapa esquemático (`HU-23`) sin coordenadas. | Columnas `mapa_x` y `mapa_y` (`0..100`, `NULL` para `ZONA-MOVIL`) en `campus_zones`, usadas tanto para ordenar por distancia euclidiana como para posicionar el mapa SVG. |
| **C9** | Filtro *"Disponibles a esta hora"* (`HU-38`) dependiente del reloj del cliente. | Atajo `available_now=true` resuelto en el backend sobre `America/Hermosillo` (UTC-7 fijo). |
| **C10** | Sin paginación ni catálogo de códigos de error (`RNF-05`). | Paginación `page`/`limit` + `meta` (§5.0.4) y catálogo cerrado de 14 códigos de error en español (§5.0.2). |
| **C11** | Zona horaria de timestamps SQLite. | Almacenamiento UTC, serialización ISO-8601 con `Z` y formateo en `America/Hermosillo`. |
| **C12** | Formato de contactos (`HU-13`, `HU-29`) e integridad de contacto principal. | Reglas de normalización por tipo (§5.3.8) e índice único parcial `uq_contacts_principal` (`WHERE es_principal = 1`). |
| **C13** | Sin estrategia de pruebas automatizadas. | Suite de integración obligatoria con `node:test` + `supertest` sobre SQLite temporal (§7.2). |
| **C14** | Contraste insuficiente del dorado `#F2A900` sobre blanco (`1.9:1`). | Regla explícita en §6.1: el dorado solo se usa como fondo con texto `#002D62` (`7.5:1`, WCAG AAA). |
| **C15** | Columnas `updated_at` estáticas en SQLite. | Triggers `AFTER UPDATE` (`trg_*_updated_at`) en `schema.sql`. |
| **C16** | Imágenes para cuentas demo sin versionar binarios pesados. | `seed.js` genera placeholders SVG deterministas en `uploads/` y `storage/credentials/`. |

## 5. Decisiones durante la construcción

### F4-01 — Instalación reproducible y verificaciones (2026-10-22)

La instalación limpia con npm 11.19.0 intentó sintetizar `node-gyp rebuild` para `better-sqlite3` 13.0.3 al leer el lockfile, aunque el paquete declara `gypfile: false` y distribuye binarios precompilados. Se agrega en la raíz `allowScripts: { "better-sqlite3@13.0.3": false }`, limitado a esa versión. No se desactivan globalmente los scripts ni se modifica el paquete instalado. En una copia limpia se verifican `npm install` y la apertura de SQLite con el binario distribuido. Revisar esta excepción al actualizar la dependencia; plataformas sin binario compatible requieren una instalación con herramientas de compilación y una revisión de esta política.

La configuración plana de ESLint utiliza el parser JSX incluido y una regla local para reconocer referencias a componentes; no añade dependencias. `npm test` conserva toda la suite del backend y agrega pruebas del cliente HTTP real. `npm run test:e2e` ejecuta Chromium instalado mediante CDP nativo con puertos, perfil, SQLite y archivos temporales, sin modificar datos locales.

### F2B-01 — Contactos sociales de un carácter (2026-10-21)

La sección 5.3.8 permite nombres de usuario de Instagram y TikTok de 1 a 30 caracteres, pero el DDL y el diccionario exigían al menos 2 caracteres en `business_contacts.valor`. Con autorización del usuario, el CHECK pasa a `length(valor) BETWEEN 1 AND 200` en el DDL oficial y en la especificación maestra. No cambian los campos, endpoints ni las validaciones de teléfono o URL.

Las bases existentes requieren reconstruir únicamente `business_contacts` en una transacción, conservando filas, identificadores, secuencia AUTOINCREMENT e índice de contacto principal. El procedimiento está en la sección 7 de `docs/especificacion-base-de-datos.md`; `CREATE TABLE IF NOT EXISTS` no modifica un CHECK existente. No se debe usar `db:reset` para aplicar este ajuste a una base con datos.
