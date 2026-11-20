CREATE TABLE offers (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  generator_id integer NOT NULL REFERENCES users(id),
  collector_id integer REFERENCES users(id),
  material text NOT NULL CHECK (material IN ('papel','cartón','plástico','vidrio','metal','electrónicos')),
  district text NOT NULL,
  weight_kg numeric(6,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg <= 1000),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'available' AND collector_id IS NULL) OR (status <> 'available' AND collector_id IS NOT NULL))
);
CREATE INDEX offers_status_idx ON offers(status, id DESC);
CREATE INDEX offers_generator_idx ON offers(generator_id);
CREATE INDEX offers_collector_idx ON offers(collector_id);
