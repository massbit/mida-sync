CREATE TABLE IF NOT EXISTS rivers (
    id SERIAL PRIMARY KEY,
    station_id TEXT NOT NULL UNIQUE,
    river_name TEXT NOT NULL,
    station_name TEXT NOT NULL,
    soglia1 NUMERIC,
    soglia2 NUMERIC,
    soglia3 NUMERIC,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS river_levels (
    id SERIAL PRIMARY KEY,
    river_id INTEGER NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL,
    soglia1_above BOOLEAN,
    soglia2_above BOOLEAN,
    soglia3_above BOOLEAN,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS river_levels_river_id_created_on_idx
    ON river_levels (river_id, created_on DESC);
