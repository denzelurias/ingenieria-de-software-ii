# Especificación Formal de Arquitectura de Software (SAD) — EmprendeBúho

* **Sistema:** EmprendeBúho — *"Tu campus, tus emprendimientos"*
* **Organización / Contexto:** Universidad de Sonora (UNISON), Campus Hermosillo — Ingeniería de Software II
* **Versión:** 2.0
* **Fecha:** 2026-10-19
* **Documentos relacionados:**
  * Contrato maestro de producto y API: [`especificacion_tecnica_emprendebuho.md`](../especificacion_tecnica_emprendebuho.md)
  * Especificación formal de base de datos: [`docs/especificacion-base-de-datos.md`](especificacion-base-de-datos.md)
  * Esquema SQL ejecutable: [`backend/database/schema.sql`](../backend/database/schema.sql)
  * Plan de construcción por fases: [`docs/plan-de-construccion.md`](plan-de-construccion.md)
  * Bitácora de decisiones técnicas (ADR): [`docs/decisiones-tecnicas.md`](decisiones-tecnicas.md)

---

## 1. Propósito, Alcance y Principios Arquitectónicos

### 1.1 Propósito del Documento
Este Documento de Arquitectura de Software (*Software Architecture Document*, SAD) especifica de manera formal y verificable la estructura estática, el comportamiento dinámico, la descomposición en capas, los mecanismos transversales de seguridad y privacidad, y las garantías de atributos de calidad de **EmprendeBúho**, combinando el **Modelo C4** (Contexto, Contenedores, Componentes y Código) con el modelo de **4+1 Vistas de Kruchten** (Lógica, Procesos, Desarrollo, Despliegue y Escenarios).

### 1.2 Restricciones de Alcance Arquitectónico
De acuerdo con §1.2 de la especificación maestra:
1. **Ejecución 100 % local y autónoma:** el sistema opera íntegramente en una estación de trabajo local sin servicios en la nube, sin servidores SMTP externos y sin motores de bases de datos cliente-servidor externos.
2. **Prohibición de pagos y carritos:** no existen módulos de pasarelas de pago, carritos de compra ni saldos.
3. **Prohibición de logística de reparto:** el sistema conecta al consumidor con el emprendedor mediante enlaces profundos de contacto directo (`wa.me`, `tel:`, redes sociales); el acuerdo ocurre fuera de la plataforma.
4. **Acceso sin fricción para el consumidor:** toda la consulta del directorio, buscador, filtros, favoritos y reportes opera sin cuenta de consumidor.

### 1.3 Principios Rectores de Diseño

| Código | Principio | Materialización en la Arquitectura |
| ----- | ----- | ----- |
| **PA-01** | **Separación estricta de responsabilidades en 4 capas (Backend)** | `Routes → Controllers → Services → Repositories`. Ningún controlador contiene lógica de negocio ni SQL; ningún repositorio conoce objetos HTTP (`req`, `res`). |
| **PA-02** | **Privacidad por diseño y por defecto (`RNF-06`)** | La ubicación inicia apagada (`mostrar_ubicacion = 0`), las credenciales estudiantiles viven fuera de la raíz estática (`backend/storage/credentials/`) y toda salida pública pasa obligatoriamente por el serializador `sanitizePublicBusiness()`. |
| **PA-03** | **Integridad declarativa en la base de datos** | Las invariantes de dominio (matrícula de 9 dígitos, horario válido, ubicación pública con zona obligatoria, motivo obligatorio en sanciones, un solo contacto principal) se imponen simultáneamente con `zod` en la entrada HTTP y con restricciones `CHECK` / `UNIQUE` / `FOREIGN KEY` en SQLite. |
| **PA-04** | **Revocación inmediata de sesión sin estado compartido** | Los JWT incluyen `tv` (`token_version`). Cada petición autenticada verifica en SQLite (lectura en microsegundos por clave primaria) el `estado_cuenta` y la versión del token, permitiendo invalidar sesiones al instante al suspender o eliminar cuentas. |
| **PA-05** | **Determinismo de errores en español (`RNF-05`)** | Un único middleware global (`error.middleware.js`) intercepta `AppError`, `ZodError`, `MulterError` y `SqliteError` y los traduce al catálogo cerrado de 14 códigos (§5.0.2) sin exponer trazas de pila ni errores crudos de SQLite. |

---

## 2. Modelo C4 de la Arquitectura

### 2.1 Nivel 1 (C1) — Diagrama de Contexto del Sistema

Muestra a **EmprendeBúho** como una caja negra y sus interacciones con los tres actores humanos del campus UNISON y los sistemas externos invocados mediante enlaces profundos del navegador.

```mermaid
flowchart TB
    Consumidor["👤 Consumidor Universitario\n(Estudiante / Docente / Visitante UNISON)\nSin cuenta en el sistema"]
    Emprendedor["🧑‍🍳 Estudiante Emprendedor UNISON\nCuenta verificada con correo @unison.mx\ny credencial institucional"]
    Admin["🛡️ Administrador de Plataforma\nModera solicitudes, productos,\nreportes y mantenimiento"]

    Sistema["🦉 Sistema EmprendeBúho\nDirectorio y red social de emprendimientos\nestudiantiles UNISON (SPA + API REST + SQLite)"]

    WhatsApp["💬 WhatsApp / Telefonía Móvil\n(Enlaces profundos wa.me / tel:)"]
    Redes["📱 Redes Sociales Externas\n(Instagram, TikTok, Facebook)"]

    Consumidor -- "Explora, busca, filtra por zona/precio/horario,\nguarda favoritos en navegador y reporta (HTTPS/HTTP)" --> Sistema
    Consumidor -- "Contacta en 2 clics desde el perfil" --> WhatsApp
    Consumidor -- "Abre perfil social del negocio" --> Redes

    Emprendedor -- "Solicita registro con credencial, gestiona perfil,\ncatálogo, horarios, estado Abierto/Cerrado y ubicación" --> Sistema
    Admin -- "Aprueba/rechaza cuentas, modera productos,\nresuelve reportes y respalda base de datos" --> Sistema
```

---

### 2.2 Nivel 2 (C2) — Diagrama de Contenedores

Detalla las unidades ejecutables y de almacenamiento dentro del entorno local del monorepo (`emprendebuho/`).

```mermaid
flowchart LR
    subgraph Cliente["Navegador Web (Móvil 360px+ / Escritorio)"]
        SPA["Contenedor: Frontend SPA\nReact 19 + Vite + Tailwind CSS v4\nPuerto :5173 (dev)"]
        LocalStore[("Almacenamiento Local del Navegador\nlocalStorage:\n- emprendebuho_token (JWT)\n- emprendebuho_favorites (IDs)")]
    end

    subgraph HostLocal["Servidor Local Node.js 22/24 LTS (Puerto :4000)"]
        API["Contenedor: Backend API REST\nExpress 5 + Zod + Multer + JWT"]
        Scheduler["Módulo residente: Planificador Local\n(Barrido de inactividad y vencimiento\nde suspensiones cada 12 h)"]
    end

    subgraph Persistencia["Sistema de Archivos Local (backend/)"]
        SQLite[("Base de Datos Relacional\ndatabase/emprendebuho.sqlite\nSQLite 3 (WAL + Foreign Keys)")]
        Backups[("Carpeta de Respaldos\ndatabase/backups/*.sqlite\n(API nativa db.backup)")]
        Uploads[["Almacenamiento Público de Imágenes\nuploads/{profiles,menus,products}\nServido en GET /uploads/*"]]
        Storage[["Bóveda Privada de Credenciales\nstorage/credentials/*\nPROHIBIDO acceso estático"]]
    end

    SPA <--> LocalStore
    SPA -- "JSON / multipart sobre HTTP\n(/api/* vía proxy Vite)" --> API
    SPA -- "Carga de imágenes públicas\n(GET /uploads/*)" --> Uploads

    API <--> SQLite
    API -- "db.backup()" --> Backups
    API -- "Lectura/Escritura validada\n(JPEG/PNG/WebP <= 5 MB)" --> Uploads
    API -- "Escritura en registro y entrega\nprotegida solo a rol admin" --> Storage
    Scheduler --> SQLite
```

---

### 2.3 Nivel 3 (C3) — Diagrama de Componentes del Backend (`backend/src/`)

El servidor Express 5 se estructura en cuatro capas horizontales estrictas más un conjunto de componentes transversales:

```mermaid
flowchart TB
    subgraph Transversal["Capa Transversal HTTP y Seguridad (app.js / middlewares/)"]
        HelmetCORS["helmet + cors + express.json"]
        RateLimiter["rateLimit.middleware.js\n(login, registro, reset, reportes)"]
        AuthMW["auth.middleware.js (requireAuth)\nVerifica JWT + estado_cuenta + token_version"]
        RoleMW["role.middleware.js\nrequireRole('emprendedor' | 'admin')"]
        UploadMW["config/upload.js (multer)\npublicImage() / credentialImage"]
        ValidateMW["validate.middleware.js\nValidación declarativa Zod"]
        ErrorMW["error.middleware.js\nTraducción determinista al catálogo §5.0.2"]
    end

    subgraph Capas["Arquitectura en 4 Capas por Dominio"]
        Routes["1. Capa de Enrutamiento (routes/*.routes.js)\nauth | catalog | business | product | myBusiness | notification | report | admin"]
        Controllers["2. Capa de Controladores (controllers/*.controller.js)\nExtrae datos validados de req y responde con ok(res, data, message, meta)"]
        Services["3. Capa de Servicios de Dominio (services/*.service.js)\nReglas de negocio, transacciones db.transaction(), touchActivity(), serializers, notificaciones y auditoría"]
        Repos["4. Capa de Repositorios (repositories/*.repository.js)\nSentencias SQL parametrizadas sobre better-sqlite3"]
    end

    subgraph Infra["Infraestructura Local (config/ y utils/)"]
        DBConn["config/db.js\nbetter-sqlite3 + PRAGMAs + función SQL normalizar()"]
        FileUtil["utils/files.js\nBorrado seguro de archivos reemplazados/huérfanos"]
        TimeUtil["utils/time.js\nReloj America/Hermosillo (UTC-7)"]
    end

    HelmetCORS --> Routes
    Routes --> RateLimiter --> AuthMW --> RoleMW --> UploadMW --> ValidateMW --> Controllers
    Controllers --> Services
    Services --> Repos
    Services --> FileUtil
    Services --> TimeUtil
    Repos --> DBConn
    Controllers -. "Excepciones / AppError" .-> ErrorMW
    Services -. "Excepciones / AppError" .-> ErrorMW
    Repos -. "SqliteError" .-> ErrorMW
```

#### Responsabilidades de los Componentes del Backend

| Componente | Archivos | Responsabilidad Única |
| ----- | ----- | ----- |
| **Configuración y Arranque** | `config/env.js`, `config/db.js`, `config/upload.js`, `app.js`, `server.js` | Validar variables de entorno, abrir SQLite en modo WAL, registrar `normalizar()`, ejecutar `schema.sql` y `seed.js` si la BD está vacía, montar Express y programar el mantenimiento periódico. |
| **Middlewares de Seguridad y Validación** | `middlewares/{auth,role,validate,rateLimit,error}.middleware.js` | Autenticar tokens contra `users.token_version`, autorizar por rol, limitar tasa por IP, validar `body`/`query`/`params` con `zod` y formatear todos los errores. |
| **Módulo de Autenticación y Cuenta** | `auth.{routes,controller,service,validator}.js`, `user.repository.js` | Registro con credencial (`HU-01`), reutilización de cuentas rechazadas/eliminadas, login con verificación de estado (`HU-40`), consulta pública de estatus (`HU-27`), recuperación de contraseña (`HU-32`) y baja de cuenta (`HU-28`). |
| **Módulo Público de Directorio y Productos** | `catalog.*`, `business.*`, `product.*`, `businessPublic.repository.js`, `productPublic.repository.js`, `serializers.js` | Catálogos (`HU-05`), exploración y búsqueda multicriterio de negocios y productos (`HU-14, 15, 18, 19, 23, 29, 30, 31, 33, 37, 38, 39`) garantizando `sanitizePublicBusiness()` (`RNF-06`). |
| **Módulo de Panel del Emprendedor** | `myBusiness.{routes,controller,service,repository,validator}.js`, `product.{service,repository,validator}.js` | Gestión autenticada del propio negocio (`HU-02..13, 17, 34, 36`) y actualización automática de `last_activity_at` e `inactivo_oculto = 0` en cada escritura (`touchActivity`). |
| **Módulo de Reportes y Notificaciones** | `report.*`, `notification.*` | Recepción de denuncias anónimas con deduplicación por `ip_hash` (`HU-26`) y bandeja de notificaciones internas + log estructurado en consola (`HU-27`). |
| **Módulo de Administración y Mantenimiento** | `admin.*`, `maintenance.service.js`, `audit.repository.js` | Aprobación/rechazo con entrega privada de credencial (`HU-20B/21`), suspensión temporal (`HU-22`), moderación de productos (`HU-20A`), resolución transaccional de reportes (`HU-24, 35`), categorías (`HU-16`), barrido de inactividad, respaldos `.sqlite` y bitácora (`HU-25`). |

---

### 2.4 Nivel 3 (C3) — Diagrama de Componentes del Frontend (`frontend/src/`)

```mermaid
flowchart TB
    subgraph Entrada["Enrutador y Proveedores Globales (App.jsx)"]
        Router["BrowserRouter + Routes (react-router v7)"]
        AuthCtx["AuthContext\nSesión JWT + usuario + restauración /api/auth/me"]
        FavCtx["FavoritesContext\nSincronización con localStorage (HU-31)"]
        ToastCtx["ToastContext\nAlertas accesibles en español (RNF-05)"]
    end

    subgraph Layouts["Layouts Responsivos Mobile-First (components/layout/)"]
        PubLayout["Navbar (escritorio) + BottomNav (móvil <768px) + Footer"]
        EntLayout["EntrepreneurLayout\nCabecera con interruptores maestros:\nAbierto/Cerrado (HU-17) y Ubicación Pública/Privada (HU-12)"]
        AdmLayout["AdminLayout + AdminSidebar"]
        Guard["RequireRole('emprendedor' | 'admin')"]
    end

    subgraph Paginas["Páginas por Rol (pages/)"]
        PubPages["Públicas:\nExplorePage | BusinessDetailPage | FavoritesPage | ApplicationStatusPage"]
        AuthPages["Autenticación:\nLoginPage | RegisterRequestPage | ForgotPasswordPage | ResetPasswordPage | AccountStatusPage"]
        EntPages["Emprendedor (/panel/*):\nDashboard | ProfileEditor | CatalogManager | ScheduleLocation | ProfilePreview | Notifications | AccountSettings"]
        AdmPages["Administrador (/admin/*):\nAdminDashboard | PendingRequests | ReportsManager | ModerationProducts | CategoriesManager | SystemMaintenance"]
    end

    subgraph Compartidos["Componentes de Dominio Reutilizables (components/)"]
        ProfileView["BusinessProfileView.jsx\n(Compartido por BusinessDetailPage HU-18 y ProfilePreviewPage HU-34)"]
        SearchWidgets["SearchBar | CategoryChips | CampusZoneSelector (Mapa SVG) | FilterDrawer | SortSelector"]
        CardsModals["BusinessCard | ProductCard | ProductFormModal | ContactButtons | ReportModal | MenuLightbox"]
    end

    subgraph ClienteHTTP["Capa de Servicios (services/api.js)"]
        ApiClient["api.js (fetch wrapper)\nInyección de Bearer JWT, parseo del sobre {ok,data,error,meta}\ny cierre automático de sesión en 401"]
    end

    Router --> AuthCtx --> FavCtx --> ToastCtx
    ToastCtx --> PubLayout & EntLayout & AdmLayout
    EntLayout & AdmLayout --> Guard
    PubLayout --> PubPages & AuthPages
    EntLayout --> EntPages
    AdmLayout --> AdmPages
    PubPages & EntPages --> ProfileView
    PubPages --> SearchWidgets & CardsModals
    EntPages & AdmPages --> CardsModals
    PubPages & AuthPages & EntPages & AdmPages --> ApiClient
```

---

## 3. Vistas Arquitectónicas 4+1

### 3.1 Vista Lógica y Reglas de Dependencia entre Capas

La vista lógica impone una dependencia estrictamente unidireccional de arriba hacia abajo. Ningún módulo inferior puede importar un módulo superior:

```mermaid
flowchart TD
    R["routes/*.routes.js"] --> MW["middlewares/*.middleware.js"]
    R --> V["validators/*.validator.js"]
    R --> C["controllers/*.controller.js"]
    C --> S["services/*.service.js"]
    C --> U["utils/response.js"]
    S --> REP["repositories/*.repository.js"]
    S --> SER["services/serializers.js"]
    S --> U2["utils/{AppError,text,time,files}.js"]
    REP --> DB["config/db.js"]
```

**Invariantes de la Vista Lógica:**
1. **Prohibición de SQL fuera de `repositories/`:** ningún archivo en `routes/`, `controllers/` o `services/` puede invocar `db.prepare()`.
2. **Transacciones confinadas en `services/`:** cuando un caso de uso modifica más de una tabla (registro de emprendedor, actualización de horarios/contactos, aprobación/rechazo, suspensión, resolución de reportes), el servicio envuelve las llamadas al repositorio dentro de `db.transaction(() => { ... })()`.
3. **Sanitización obligatoria de salida:** todo endpoint público y la vista previa del emprendedor devuelven exclusivamente objetos transformados por `serializers.sanitizePublicBusiness()`.

---

### 3.2 Vista de Procesos y Comportamiento Dinámico (Diagramas de Secuencia)

#### 3.2.1 Proceso 1: Solicitud de Registro UNISON y Revisión por Administrador (`HU-01`, `HU-20B`, `HU-21`, `HU-27`, `HU-40`)

```mermaid
sequenceDiagram
    autonumber
    actor Emp as Estudiante Emprendedor
    participant SPA as React SPA
    participant API as Express API
    participant FS as storage/credentials/
    participant DB as SQLite (WAL)
    actor Adm as Administrador

    Emp->>SPA: Completa /registro (@unison.mx, matrícula 9 dígitos, foto credencial, negocio)
    SPA->>API: POST /api/auth/register-request (multipart/form-data)
    API->>FS: Guarda credencial con nombre UUID (fuera de /uploads)
    API->>DB: BEGIN IMMEDIATE TRANSACTION
    DB-->>API: Crea users(pendiente) + businesses(mostrar_ubicacion=0) + 7 business_schedules(cerrados)
    API->>DB: COMMIT
    API-->>SPA: 201 Created { estado_cuenta: "pendiente" }

    Adm->>SPA: Abre /admin/solicitudes
    SPA->>API: GET /api/admin/requests?status=pendiente (Bearer JWT Admin)
    API-->>SPA: Lista de solicitudes pendientes
    SPA->>API: GET /api/admin/requests/:userId/credential (Bearer JWT Admin)
    API->>FS: Lee archivo privado y responde con Cache-Control: private, no-store
    API-->>SPA: Imagen de credencial UNISON

    Adm->>SPA: Aprueba (o rechaza con motivo obligatorio)
    SPA->>API: PATCH /api/admin/requests/:userId { decision: "aprobada" }
    API->>DB: TRANSACTION: UPDATE users + INSERT notifications + INSERT audit_logs
    API-->>SPA: 200 OK
```

#### 3.2.2 Proceso 2: Búsqueda Multicriterio con Garantía de Privacidad (`HU-12`, `HU-14`, `HU-15`, `HU-23`, `HU-30`, `HU-33`, `HU-38`, `HU-39`, `RNF-06`)

```mermaid
sequenceDiagram
    autonumber
    actor Con as Consumidor Anónimo
    participant SPA as ExplorePage (React)
    participant Ctrl as business.controller.js
    participant Svc as businessPublic.service.js
    participant Repo as businessPublic.repository.js
    participant DB as SQLite + normalizar()

    Con->>SPA: Filtra (q="limon", zone_id=1, min_price=20, max_price=60, available_now=true)
    SPA->>Ctrl: GET /api/businesses?q=limon&zone_id=1&min_price=20&max_price=60&available_now=true
    Ctrl->>Svc: listPublicBusinesses(validatedQuery)
    Svc->>Svc: Calcula nowInHermosillo() -> { dow, time } y escapeLike(normalizar(q))
    Svc->>Repo: findPublicBusinesses(params, sortClause)
    Repo->>DB: SELECT parametrizado (excluye mostrar_ubicacion=0 si hay zone_id)
    DB-->>Repo: Filas crudas de negocios visibles
    Repo-->>Svc: rows
    Svc->>Svc: rows.map(sanitizePublicBusiness)\n(si mostrar_ubicacion=0 -> fuerza zona y detalle a null)
    Svc-->>Ctrl: { items, meta }
    Ctrl-->>SPA: 200 OK { ok: true, data: items, meta }
```

#### 3.2.3 Proceso 3: Reporte de Consumidor y Resolución con Sanción Atómica (`HU-20A`, `HU-22`, `HU-24`, `HU-26`, `HU-35`)

```mermaid
sequenceDiagram
    autonumber
    actor Con as Consumidor Anónimo
    participant API as Express API
    participant DB as SQLite
    actor Adm as Administrador
    actor Emp as Emprendedor Denunciado

    Con->>API: POST /api/reports { business_id, product_id, motivo, descripcion }
    API->>API: Calcula ip_hash = SHA256(ip + REPORT_IP_SALT)
    API->>DB: Verifica no duplicado (ip_hash, business_id) en últimas 24 h
    API->>DB: INSERT INTO reports(estado_reporte='pendiente')
    API-->>Con: 201 Created

    Adm->>API: PATCH /api/admin/reports/:id\n{ estado_reporte: "resuelto_con_sancion", accion_automatica: "suspender_cuenta", motivo_sancion: "..." }
    API->>DB: BEGIN TRANSACTION
    API->>DB: 1) UPDATE reports SET estado_reporte='resuelto_con_sancion', accion_tomada='suspender_cuenta'
    API->>DB: 2) UPDATE users SET estado_cuenta='suspendida', token_version = token_version + 1
    API->>DB: 3) UPDATE businesses SET esta_abierto = 0
    API->>DB: 4) INSERT INTO notifications(tipo='cuenta_suspendida')
    API->>DB: 5) INSERT INTO audit_logs(accion='resolver_reporte_con_suspension')
    API->>DB: COMMIT
    API-->>Adm: 200 OK

    Emp->>API: Cualquier petición con su JWT anterior (PATCH /api/my-business/open-status)
    API->>DB: requireAuth consulta users -> detecta estado_cuenta='suspendida' / token_version distinto
    API-->>Emp: 403 ACCOUNT_SUSPENDED (sesión revocada en el acto)
```

#### 3.2.4 Modelo de Concurrencia en Tiempo de Ejecución
* **Proceso único Node.js + SQLite en modo WAL (`PRAGMA journal_mode = WAL`):**
  * En modo *Write-Ahead Logging*, los lectores no bloquean a los escritores ni los escritores bloquean a los lectores.
  * El driver `better-sqlite3` ejecuta cada sentencia preparada o bloque `db.transaction()` de manera síncrona y atómica en el hilo de Node.js en fracciones de milisegundo (para el volumen de datos del campus: cientos de negocios y pocos miles de productos), evitando condiciones de carrera (*race conditions*) entre lecturas y escrituras concurrentes sin necesidad de bloqueos distribuidos.
  * `PRAGMA busy_timeout = 5000` garantiza que si el proceso de respaldo o una herramienta externa abre el archivo simultáneamente, SQLite espere hasta 5 segundos antes de devolver `SQLITE_BUSY`.

---

### 3.3 Vista de Desarrollo (Organización de Paquetes y Módulos)

| Workspace | Paquete / Carpeta | Estándar de Módulos | Propósito |
| ----- | ----- | ----- | ----- |
| Raíz (`/`) | `package.json` | npm workspaces | Orquestar `dev`, `test`, `build`, `lint` y `db:reset`. |
| `backend/` | `src/config/` | ES Modules (`import`/`export`) | Variables de entorno (`env.js`), conexión SQLite (`db.js`) y `multer` (`upload.js`). |
| `backend/` | `src/middlewares/` | ES Modules | Seguridad, autenticación, roles, validación `zod`, límites de tasa y errores. |
| `backend/` | `src/validators/` | ES Modules | Esquemas `zod` reutilizables de entrada HTTP. |
| `backend/` | `src/repositories/` | ES Modules | Consultas SQL preparadas y nombradas (`:param`). |
| `backend/` | `src/services/` | ES Modules | Lógica de negocio, transacciones, serializadores y tareas de mantenimiento. |
| `backend/` | `src/controllers/` | ES Modules | Adaptadores HTTP delgados (`req` → servicio → `ok(res, ...)`). |
| `backend/` | `src/routes/` | ES Modules | Definición de endpoints REST bajo `/api`. |
| `backend/` | `tests/` | `node:test` + `supertest` | Pruebas de integración extremo a extremo sobre SQLite temporal. |
| `frontend/` | `src/context/` | React 19 JSX | Estado global (`AuthContext`, `FavoritesContext`, `ToastContext`). |
| `frontend/` | `src/services/` | ES Modules | Cliente HTTP centralizado (`api.js`). |
| `frontend/` | `src/components/` | React 19 JSX + Tailwind v4 | Componentes reutilizables divididos en `layout`, `routing`, `business`, `product`, `search` y `common`. |
| `frontend/` | `src/pages/` | React 19 JSX | Vistas por rol (`public`, `auth`, `entrepreneur`, `admin`). |

---

### 3.4 Vista Física y de Despliegue Local

```mermaid
flowchart TB
    subgraph MaquinaLocal["Estación de Trabajo Local (Windows / macOS / Linux)"]
        subgraph DevMode["Modo Desarrollo (npm run dev)"]
            ViteDev["Servidor Vite (:5173)\nSirve SPA con HMR\nProxy /api y /uploads -> :4000"]
            NodeDev["Servidor Express (:4000)\nEjecutado con nodemon"]
        end

        subgraph Disco["Almacenamiento en Disco Local"]
            DBFile["backend/database/emprendebuho.sqlite (+ .sqlite-wal / .sqlite-shm)"]
            BakDir["backend/database/backups/emprendebuho_YYYYMMDD_HHMMSS.sqlite"]
            PubDir["backend/uploads/{profiles,menus,products}/*"]
            PrivDir["backend/storage/credentials/*"]
        end
    end

    ViteDev -- "Proxy HTTP local" --> NodeDev
    NodeDev <--> DBFile
    NodeDev --> BakDir
    NodeDev <--> PubDir
    NodeDev <--> PrivDir
```

---

### 3.5 Vista de Escenarios y Garantías de Atributos de Calidad (`RNF-01` a `RNF-06`)

| RNF | Atributo de Calidad | Estímulo | Respuesta Arquitectónica y Medición Verificable |
| ----- | ----- | ----- | ----- |
| **RNF-01** | **Usabilidad (Máximo 2 clics al contacto)** | Un estudiante entre clases entra a `/` buscando comida abierta y desea mandar WhatsApp. | **Clic 1:** toca la tarjeta `BusinessCard` en `/` → abre `/negocio/:slug`. **Clic 2:** toca el botón primario `Enviar WhatsApp` en `ContactButtons` (visible sin hacer scroll ni abrir submenús) → abre `https://wa.me/52...`. |
| **RNF-02** | **Adaptabilidad Mobile-First** | Acceso desde pantalla móvil de `360px` de ancho. | En `< 768px` se oculta la navegación de escritorio y se fija `BottomNav.jsx` en la parte inferior con objetivos táctiles `>= 44x44 px`; los filtros avanzados abren en un `FilterDrawer` deslizable. |
| **RNF-03** | **Disponibilidad y Precisión Horaria (`07:00–21:00`)** | Consulta del filtro *"Disponibles a esta hora"* o visualización del indicador *"Fuera de su horario habitual"*. | El cálculo se realiza en el servidor usando explícitamente la zona `America/Hermosillo` (UTC-7 todo el año, sin horario de verano) mediante `utils/time.js`, evitando desfases si el navegador del usuario tiene otra zona configurada. |
| **RNF-04** | **Identidad Visual UNISON y Accesibilidad** | Renderizado de botones, insignias y cabeceras con la paleta institucional. | Variables `--unison-blue` (`#002D62`) y `--unison-gold` (`#F2A900`) en `index.css`. Regla arquitectónica obligatoria: prohibido usar `#F2A900` como texto sobre blanco (`1.9:1`); siempre se usa como fondo con texto `#002D62` (`7.5:1`, nivel WCAG AAA). |
| **RNF-05** | **Manejo de Errores Claros en Español** | El usuario sube un archivo `.pdf` en vez de imagen, envía un correo duplicado o pierde conexión. | `error.middleware.js` captura `MulterError`, `SqliteError` y `ZodError` y devuelve siempre `{ ok: false, error: { code, message, details } }` en español; `api.js` intercepta errores de red (`TypeError: Failed to fetch`) y muestra *"No se pudo conectar con el servidor local"*. |
| **RNF-06** | **Privacidad Estricta del Emprendedor** | Un emprendedor apaga `mostrar_ubicacion = 0` (`HU-12`) y un consumidor inspecciona el tráfico JSON de la API o filtra por zona. | La consulta SQL excluye al negocio de `?zone_id=` y `sanitizePublicBusiness()` fuerza `campus_zone_id: null`, `zona_codigo: null`, `zona_nombre: null` y `ubicacion_detalle: null` en `GET /api/businesses`, `GET /api/businesses/:slug`, `GET /api/products` y `GET /api/my-business/preview`. |

---

## 4. Mecanismos Arquitectónicos Transversales

### 4.1 Defensa en Profundidad para Archivos Subidos (`config/upload.js`)

| Tipo de Imagen | Carpeta Destino | ¿Expuesta en `/uploads`? | Quién puede leerla | Límite y Formatos |
| ----- | ----- | ----- | ----- | ----- |
| Foto de perfil (`HU-04`) | `backend/uploads/profiles/` | Sí (`/uploads/profiles/<uuid>.<ext>`) | Público | `image/jpeg`, `image/png`, `image/webp` (`<= 5 MB`) |
| Foto de menú (`HU-03`) | `backend/uploads/menus/` | Sí (`/uploads/menus/<uuid>.<ext>`) | Público | `image/jpeg`, `image/png`, `image/webp` (`<= 5 MB`) |
| Imagen de producto (`HU-02`) | `backend/uploads/products/` | Sí (`/uploads/products/<uuid>.<ext>`) | Público | `image/jpeg`, `image/png`, `image/webp` (`<= 5 MB`) |
| Credencial UNISON (`HU-01`) | `backend/storage/credentials/` | **No (Prohibido)** | Solo `admin` vía `GET /api/admin/requests/:userId/credential` | `image/jpeg`, `image/png`, `image/webp` (`<= 5 MB`) |

### 4.2 Tubería de Procesamiento de una Petición en Express 5

```mermaid
flowchart LR
    Req["HTTP Request"] --> H["1. helmet + cors"]
    H --> Body["2. express.json / multer"]
    Body --> RL["3. rateLimit (si aplica)"]
    RL --> Auth["4. requireAuth (si ruta protegida)"]
    Auth --> Role["5. requireRole (si aplica)"]
    Role --> Val["6. validate(zodSchema)"]
    Val --> Ctrl["7. Controller -> Service -> Repository"]
    Ctrl --> Res["8. ok(res, data, message, meta)"]
    RL & Auth & Role & Val & Ctrl -. "throw / next(err)" .-> Err["errorHandler -> JSON { ok:false, error }"]
```

---

## 5. Matriz de Trazabilidad Arquitectónica (RF y RNF → Componentes)

| Requerimiento | Componentes del Backend | Componentes del Frontend | Tablas SQLite Involucradas |
| ----- | ----- | ----- | ----- |
| **RF-01** (Aprobación de registro UNISON) | `auth.controller`, `admin.controller`, `auth.service`, `admin.service`, `config/upload` | `RegisterRequestPage`, `PendingRequestsPage`, `ApplicationStatusPage` | `users`, `businesses`, `business_schedules`, `notifications`, `audit_logs` |
| **RF-02** (Login y gestión de perfil) | `auth.*`, `myBusiness.*`, `auth.middleware` | `LoginPage`, `AuthContext`, `EntrepreneurLayout`, `ProfileEditorPage` | `users`, `businesses`, `business_contacts`, `categories` |
| **RF-03** (CRUD y pausa de catálogo) | `myBusiness.controller`, `product.service`, `product.repository` | `CatalogManagerPage`, `ProductFormModal`, `ConfirmDialog` | `products`, `businesses` |
| **RF-04** (Horario semanal) | `myBusiness.controller`, `myBusiness.service`, `myBusiness.repository` | `ScheduleLocationPage`, `ScheduleTable` | `business_schedules`, `businesses` |
| **RF-05** (Interruptor Abierto/Cerrado) | `myBusiness.controller` (`PATCH /open-status`), `utils/time.js` | `EntrepreneurLayout`, `StatusBadge` | `businesses`, `business_schedules` |
| **RF-06** (Ubicación voluntaria y privada) | `myBusiness.controller` (`PATCH /location`), `serializers.sanitizePublicBusiness` | `EntrepreneurLayout`, `ScheduleLocationPage`, `ZoneBadge`, `CampusZoneSelector` | `businesses`, `campus_zones` |
| **RF-07** (Búsqueda sin cuenta) | `business.controller`, `product.controller`, `utils/text.js` (`normalizar`) | `ExplorePage`, `SearchBar`, `BusinessCard`, `ProductCard` | `businesses`, `products`, `users` |
| **RF-08** (Filtrado multicriterio) | `businessPublic.service`, `businessPublic.repository` | `CategoryChips`, `CampusZoneSelector`, `PriceRangeFilter`, `FilterDrawer`, `SortSelector` | `businesses`, `categories`, `campus_zones`, `products`, `business_schedules` |
| **RF-09** (Moderación de productos y suspensión) | `admin.controller`, `admin.service`, `report.service`, `maintenance.service` | `ModerationProductsPage`, `ReportsManagerPage`, `PendingRequestsPage` | `products`, `users`, `businesses`, `reports`, `notifications`, `audit_logs` |
| **RF-10** (Medios de contacto directo) | `myBusiness.service` (normalización), `businessPublic.service` | `ContactButtons`, `ProfileEditorPage`, `utils/contactLinks.js` | `business_contacts` |
