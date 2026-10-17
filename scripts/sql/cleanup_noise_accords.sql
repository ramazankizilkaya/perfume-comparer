-- Gürültü akorlarını temizler: adı yalnızca rakamdan oluşan ("2", "3", "4", "5")
-- ve "AD" akorları ile bunların parfüm bağlantıları silinir.
-- Tekrar çalıştırılabilir (idempotent); eşleşen satır yoksa hiçbir şey yapmaz.
-- Çalıştır: psql -d perfume_comparer -f scripts/sql/cleanup_noise_accords.sql
-- Kalıcı çözüm import_data.py'deki is_noise_accord filtresidir; bu dosya mevcut
-- veritabanını yeniden içe aktarmadan düzeltmek içindir.
BEGIN;

DELETE FROM perfume_accords pa
USING accords a
WHERE pa.accord_id = a.id
  AND (a.name ~ '^[0-9]+$' OR a.name = 'AD');

DELETE FROM accords
WHERE name ~ '^[0-9]+$' OR name = 'AD';

COMMIT;
