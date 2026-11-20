ALTER TABLE places
  ADD COLUMN latitude double precision CHECK (latitude BETWEEN -90 AND 90),
  ADD COLUMN longitude double precision CHECK (longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT places_coordinate_pair CHECK ((latitude IS NULL) = (longitude IS NULL));

UPDATE places AS place
SET latitude = location.latitude, longitude = location.longitude
FROM (VALUES
  ('Punto Kennedy', 'Miraflores', -12.1218, -77.0292),
  ('Estación El Olivar', 'San Isidro', -12.1011, -77.0356),
  ('Acopio La Muralla', 'Cercado de Lima', -12.0432, -77.0256),
  ('Punto Municipal Jesús María', 'Jesús María', -12.0724, -77.0432),
  ('Estación María Reiche', 'Miraflores', -12.1166, -77.0545),
  ('Punto Cívico San Borja', 'San Borja', -12.1025, -76.9895)
) AS location(name, district, latitude, longitude)
WHERE place.name = location.name AND place.district = location.district;
