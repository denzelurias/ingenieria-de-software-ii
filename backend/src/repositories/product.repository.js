export function createProductRepository(db) {
  return {
    list: business_id => db.prepare("SELECT * FROM products WHERE business_id = :business_id AND estado <> 'eliminado' ORDER BY id DESC").all({ business_id }),
    find: (business_id, id) => db.prepare("SELECT * FROM products WHERE id = :id AND business_id = :business_id AND estado <> 'eliminado'").get({ business_id, id }),
    insert: params => Number(db.prepare('INSERT INTO products (business_id, nombre, descripcion, precio, imagen_url) VALUES (:business_id, :nombre, :descripcion, :precio, :imagen_url)').run(params).lastInsertRowid),
    edit: params => db.prepare(`UPDATE products SET nombre = :nombre, descripcion = :descripcion, precio = :precio, imagen_url = :imagen_url,
      updated_at = CASE WHEN estado = 'oculto_admin' AND CURRENT_TIMESTAMP <= moderado_at THEN datetime(moderado_at, '+1 second') ELSE CURRENT_TIMESTAMP END
      WHERE id = :id AND business_id = :business_id`).run(params),
    status: params => db.prepare('UPDATE products SET estado = :estado WHERE id = :id AND business_id = :business_id').run(params),
    remove: (business_id, id) => db.prepare("UPDATE products SET estado = 'eliminado', imagen_url = NULL WHERE id = :id AND business_id = :business_id").run({ business_id, id })
  };
}
