CREATE TABLE places (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  schedule text NOT NULL,
  materials text[] NOT NULL,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO places (name, district, address, schedule, materials) VALUES
  ('Punto Kennedy', 'Miraflores', 'Parque Kennedy, Miraflores, Lima, Perú', 'Lun–vie · 09:00–17:00', ARRAY['papel','cartón','plástico']),
  ('Estación El Olivar', 'San Isidro', 'Bosque El Olivar, San Isidro, Lima, Perú', 'Mar–sáb · 09:00–16:00', ARRAY['cartón','vidrio','metal']),
  ('Acopio La Muralla', 'Cercado de Lima', 'Parque de la Muralla, Cercado de Lima, Perú', 'Lun–sáb · 08:00–14:00', ARRAY['papel','plástico','vidrio']),
  ('Punto Municipal Jesús María', 'Jesús María', 'Campo de Marte, Jesús María, Lima, Perú', 'Mié–sáb · 10:00–16:00', ARRAY['plástico','metal','electrónicos']),
  ('Estación María Reiche', 'Miraflores', 'Parque María Reiche, Miraflores, Lima, Perú', 'Lun–vie · 08:00–13:00', ARRAY['papel','cartón','vidrio']),
  ('Punto Cívico San Borja', 'San Borja', 'Pentagonito, San Borja, Lima, Perú', 'Mar–sáb · 10:00–17:00', ARRAY['plástico','metal','electrónicos']);
