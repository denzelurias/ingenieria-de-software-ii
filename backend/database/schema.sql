PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =====================================================================
-- EmprendeBúho — Esquema v2 (backend/database/schema.sql)
-- Convenciones:
--   * Fechas en UTC con formato 'YYYY-MM-DD HH:MM:SS' (CURRENT_TIMESTAMP).
--   * Booleanos como INTEGER 0/1 con CHECK.
--   * Categorías y zonas NUNCA se borran físicamente: se desactivan (FK RESTRICT).
--   * Negocios y usuarios NUNCA se borran físicamente: se cambian de estado.
--   * La función normalizar(texto) la registra db.js con db.function() (ver §4.3).
-- =====================================================================

-- 1. Usuarios (Emprendedores y Administradores). Los consumidores NO tienen cuenta.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo TEXT NOT NULL CHECK (length(trim(nombre_completo)) BETWEEN 3 AND 120),
    matricula_unison TEXT UNIQUE CHECK (
        matricula_unison IS NULL
        OR (length(matricula_unison) = 9 AND matricula_unison NOT GLOB '*[^0-9]*')
    ),
    email_institucional TEXT NOT NULL UNIQUE COLLATE NOCASE,  -- dominio validado en la app (ALLOWED_EMAIL_DOMAINS)
    password_hash TEXT NOT NULL,
    credencial_path TEXT,                                      -- ruta relativa dentro de backend/storage/ (NO pública)
    rol TEXT NOT NULL DEFAULT 'emprendedor' CHECK (rol IN ('emprendedor', 'admin')),
    estado_cuenta TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        estado_cuenta IN ('pendiente', 'aprobada', 'rechazada', 'suspendida', 'eliminada')
    ),
    motivo_estado TEXT,                                        -- motivo de rechazo o suspensión
    suspendida_hasta DATETIME,                                 -- NULL = suspensión indefinida (hasta que un admin la levante)
    resuelto_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    fecha_resolucion DATETIME,
    token_version INTEGER NOT NULL DEFAULT 0,                  -- se incrementa para revocar todos los JWT emitidos
    last_login_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (rol = 'admin' OR (matricula_unison IS NOT NULL AND credencial_path IS NOT NULL)),
    CHECK (estado_cuenta NOT IN ('rechazada', 'suspendida') OR motivo_estado IS NOT NULL)
);

-- 2. Categorías del sistema (HU-05, HU-16, HU-19)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (length(trim(nombre)) BETWEEN 2 AND 60),
    slug TEXT NOT NULL UNIQUE CHECK (slug NOT GLOB '*[^a-z0-9-]*'),
    descripcion TEXT NOT NULL DEFAULT '' CHECK (length(descripcion) <= 200),
    icono TEXT NOT NULL DEFAULT 'Store',                       -- nombre de ícono de lucide-react
    activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Zonas del campus UNISON (HU-10, HU-23, HU-30)
-- mapa_x / mapa_y: posición en una cuadrícula 0..100 del mapa esquemático (NULL = sin punto fijo).
CREATE TABLE IF NOT EXISTS campus_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL DEFAULT '',
    mapa_x INTEGER CHECK (mapa_x IS NULL OR mapa_x BETWEEN 0 AND 100),
    mapa_y INTEGER CHECK (mapa_y IS NULL OR mapa_y BETWEEN 0 AND 100),
    orden_visual INTEGER NOT NULL DEFAULT 0,
    activa INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1)),
    CHECK ((mapa_x IS NULL) = (mapa_y IS NULL))
);

-- 4. Emprendimientos (HU-03, HU-04, HU-05, HU-06, HU-10, HU-12, HU-17)
CREATE TABLE IF NOT EXISTS businesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    campus_zone_id INTEGER REFERENCES campus_zones(id) ON DELETE RESTRICT,
    nombre_negocio TEXT NOT NULL CHECK (length(trim(nombre_negocio)) BETWEEN 2 AND 80),
    slug TEXT NOT NULL UNIQUE CHECK (slug NOT GLOB '*[^a-z0-9-]*'),
    descripcion TEXT NOT NULL DEFAULT '' CHECK (length(descripcion) <= 1000),
    foto_perfil_url TEXT,                                      -- '/uploads/profiles/<uuid>.webp'
    foto_menu_url TEXT,                                        -- '/uploads/menus/<uuid>.jpg'
    esta_abierto INTEGER NOT NULL DEFAULT 0 CHECK (esta_abierto IN (0, 1)),
    mostrar_ubicacion INTEGER NOT NULL DEFAULT 0 CHECK (mostrar_ubicacion IN (0, 1)),
    ubicacion_detalle TEXT NOT NULL DEFAULT '' CHECK (length(ubicacion_detalle) <= 120),
    inactivo_oculto INTEGER NOT NULL DEFAULT 0 CHECK (inactivo_oculto IN (0, 1)),
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (mostrar_ubicacion = 0 OR campus_zone_id IS NOT NULL)
);

-- 5. Horario semanal (HU-36, HU-38). Siempre existen las 7 filas por negocio.
-- dia_semana: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado. Horas 'HH:MM' 24 h (America/Hermosillo).
CREATE TABLE IF NOT EXISTS business_schedules (
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_apertura TEXT CHECK (hora_apertura IS NULL OR hora_apertura GLOB '[0-2][0-9]:[0-5][0-9]'),
    hora_cierre TEXT CHECK (hora_cierre IS NULL OR hora_cierre GLOB '[0-2][0-9]:[0-5][0-9]'),
    cerrado_todo_el_dia INTEGER NOT NULL DEFAULT 1 CHECK (cerrado_todo_el_dia IN (0, 1)),
    PRIMARY KEY (business_id, dia_semana),
    CHECK (
        cerrado_todo_el_dia = 1
        OR (hora_apertura IS NOT NULL AND hora_cierre IS NOT NULL AND hora_apertura < hora_cierre)
    )
) WITHOUT ROWID;

-- 6. Medios de contacto (HU-13, HU-29). Valores normalizados (ver §5.3 PUT /contacts).
CREATE TABLE IF NOT EXISTS business_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    tipo_contacto TEXT NOT NULL CHECK (
        tipo_contacto IN ('whatsapp', 'telefono', 'instagram', 'facebook', 'tiktok', 'otro')
    ),
    valor TEXT NOT NULL CHECK (length(valor) BETWEEN 2 AND 200),
    etiqueta TEXT CHECK (etiqueta IS NULL OR length(etiqueta) <= 40),
    es_principal INTEGER NOT NULL DEFAULT 0 CHECK (es_principal IN (0, 1)),
    orden INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (business_id, tipo_contacto, valor)
);

-- 7. Catálogo de productos (HU-02, HU-07, HU-08, HU-09, HU-11, HU-20A, HU-33, HU-37)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 80),
    descripcion TEXT NOT NULL CHECK (length(trim(descripcion)) BETWEEN 1 AND 500),
    precio REAL NOT NULL CHECK (precio >= 0 AND precio <= 99999.99),
    imagen_url TEXT,                                           -- obligatoria al crear (validación de app); NULL tras borrado lógico
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (
        estado IN ('activo', 'pausado', 'oculto_admin', 'eliminado')
    ),
    motivo_moderacion TEXT,
    moderado_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    moderado_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (estado <> 'oculto_admin' OR motivo_moderacion IS NOT NULL)
);

-- 8. Reportes de consumidores anónimos (HU-24, HU-26, HU-35)
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    motivo TEXT NOT NULL CHECK (
        motivo IN ('informacion_falsa', 'contenido_inapropiado', 'producto_prohibido', 'suplantacion', 'otro')
    ),
    descripcion TEXT NOT NULL DEFAULT '' CHECK (length(descripcion) <= 1000),
    ip_hash TEXT NOT NULL,                                     -- SHA-256(IP + REPORT_IP_SALT); nunca la IP en claro
    estado_reporte TEXT NOT NULL DEFAULT 'pendiente' CHECK (
        estado_reporte IN ('pendiente', 'en_revision', 'resuelto_con_sancion', 'desestimado')
    ),
    accion_tomada TEXT CHECK (
        accion_tomada IS NULL OR accion_tomada IN ('ninguna', 'ocultar_producto', 'suspender_cuenta')
    ),
    notas_admin TEXT,
    resuelto_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    CHECK (motivo <> 'otro' OR length(trim(descripcion)) >= 10)
);

-- 9. Notificaciones internas (HU-27, HU-20A, HU-22)
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (
        tipo IN ('cuenta_aprobada', 'cuenta_rechazada', 'cuenta_suspendida', 'cuenta_reactivada',
                 'producto_oculto', 'producto_restaurado', 'sistema')
    ),
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida INTEGER NOT NULL DEFAULT 0 CHECK (leida IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Códigos de recuperación de contraseña (HU-32)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    codigo_hash TEXT NOT NULL,                                 -- SHA-256 del código de 6 dígitos
    expires_at DATETIME NOT NULL,
    intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 5),
    usado INTEGER NOT NULL DEFAULT 0 CHECK (usado IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bitácora de auditoría (HU-25). actor_id NULL = acción automática del sistema.
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accion TEXT NOT NULL,                                      -- p. ej. 'aprobar_cuenta', 'ocultar_producto', 'respaldo_bd'
    entidad_tipo TEXT NOT NULL,                                -- 'user' | 'business' | 'product' | 'report' | 'category' | 'system'
    entidad_id INTEGER,
    detalles TEXT CHECK (detalles IS NULL OR json_valid(detalles)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_estado ON users(rol, estado_cuenta, created_at);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_zone ON businesses(campus_zone_id, mostrar_ubicacion);
CREATE INDEX IF NOT EXISTS idx_businesses_visible ON businesses(inactivo_oculto, esta_abierto);
CREATE INDEX IF NOT EXISTS idx_businesses_activity ON businesses(inactivo_oculto, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_products_business_estado ON products(business_id, estado, precio);
CREATE INDEX IF NOT EXISTS idx_products_estado_precio ON products(estado, precio);
CREATE INDEX IF NOT EXISTS idx_schedules_lookup ON business_schedules(dia_semana, cerrado_todo_el_dia, hora_apertura, hora_cierre);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_principal ON business_contacts(business_id) WHERE es_principal = 1;
CREATE INDEX IF NOT EXISTS idx_reports_estado ON reports(estado_reporte, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_business ON reports(business_id);
CREATE INDEX IF NOT EXISTS idx_reports_dedupe ON reports(ip_hash, business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, leida);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id, usado);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Triggers de updated_at (SQLite no lo actualiza solo).
-- La condición WHEN evita recursión y respeta un updated_at asignado explícitamente.
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at AFTER UPDATE ON users
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_categories_updated_at AFTER UPDATE ON categories
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_businesses_updated_at AFTER UPDATE ON businesses
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE businesses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_products_updated_at AFTER UPDATE ON products
FOR EACH ROW WHEN NEW.updated_at = OLD.updated_at
BEGIN UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;
