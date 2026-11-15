-- Add focused marketplace discovery categories without changing existing products or categories.
-- Idempotent by case-insensitive name; safe to re-run if category seed has already run.
INSERT INTO "Category" ("id", "name", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  new_categories.category_name,
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  VALUES
  ('Materiais de construção — Areia'),
  ('Materiais de construção — Burgau e burgalho'),
  ('Materiais de construção — Brita e agregados'),
  ('Materiais de construção — Cimento, cal e argamassas'),
  ('Materiais de construção — Blocos e pavês'),
  ('Materiais de construção — Tijolos'),
  ('Materiais de construção — Telhas e coberturas'),
  ('Materiais de construção — Chapas de zinco e perfis'),
  ('Materiais de construção — Ferro, aço e varões'),
  ('Materiais de construção — Tintas e impermeabilização'),
  ('Materiais de construção — Tubos e canalização'),
  ('Materiais de construção — Cerâmica e sanitários'),
  ('Materiais de construção — Vidros e caixilharia'),
  ('Metalurgia e transformação de metais'),
  ('Metalurgia — Serralharia e estruturas metálicas'),
  ('Metalurgia — Alumínio e inox'),
  ('Metalurgia — Chapas, perfis e tubos metálicos'),
  ('Serviços — Construção civil e empreitadas'),
  ('Serviços — Pedreiros e alvenaria'),
  ('Serviços — Telhados e coberturas'),
  ('Serviços — Pintura e acabamentos'),
  ('Eletrónica — Telemóveis e acessórios'),
  ('Eletrónica — Computadores e informática'),
  ('Eletrónica — Televisores, áudio e vídeo'),
  ('Eletrónica — Eletrodomésticos'),
  ('Eletrónica — Componentes e acessórios'),
  ('Equipamentos — Máquinas de construção'),
  ('Equipamentos — Ferramentas profissionais'),
  ('Indústria — Matérias-primas e consumíveis'),
  ('Indústria — Peças e manutenção industrial')
) AS new_categories(category_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM "Category" existing
  WHERE lower(existing."name") = lower(new_categories.category_name)
    AND existing."status" = 'ACTIVE'
);
