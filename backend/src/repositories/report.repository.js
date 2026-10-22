import { visibleBusiness } from './businessPublic.repository.js';
export function createReportRepository(db) {
  return {
    visibleBusiness: id => db.prepare(`SELECT b.id FROM businesses b JOIN users u ON u.id = b.user_id WHERE b.id = :id AND ${visibleBusiness}`).get({ id }),
    productBelongs: (business_id, product_id) => db.prepare("SELECT id FROM products WHERE id = :product_id AND business_id = :business_id AND estado <> 'eliminado'").get({ business_id, product_id }),
    recent: params => db.prepare("SELECT id FROM reports WHERE ip_hash = :ip_hash AND business_id = :business_id AND created_at > datetime('now', '-24 hours') LIMIT 1").get(params),
    insert: params => Number(db.prepare('INSERT INTO reports (business_id, product_id, motivo, descripcion, ip_hash) VALUES (:business_id, :product_id, :motivo, :descripcion, :ip_hash)').run(params).lastInsertRowid)
  };
}
