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
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One stored reading per (station, measurement time): the poller runs more often than the
    -- sensor publishes, so this de-duplicates repeated reads of the same measurement.
    UNIQUE (river_id, measured_at)
);

-- For databases created before the UNIQUE clause above existed:
--   ALTER TABLE river_levels ADD CONSTRAINT river_levels_river_id_measured_at_key
--       UNIQUE (river_id, measured_at);

CREATE INDEX IF NOT EXISTS river_levels_river_id_created_on_idx
    ON river_levels (river_id, created_on DESC);

CREATE INDEX IF NOT EXISTS river_levels_river_id_measured_at_idx
    ON river_levels (river_id, measured_at ASC);

-- Flood prediction: an upstream gauge whose readings historically preceded a threshold
-- exceedance at a downstream point of interest. Both ends are registered rivers so the poller
-- collects their readings into river_levels. Learned parameters are filled by calibration.
CREATE TABLE IF NOT EXISTS river_links (
    id SERIAL PRIMARY KEY,
    upstream_river_id INTEGER NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
    downstream_river_id INTEGER NOT NULL REFERENCES rivers(id) ON DELETE CASCADE,
    -- Which downstream soglia (1/2/3) defines the exceedance event we predict.
    target_threshold SMALLINT NOT NULL DEFAULT 1,
    lead_time_minutes INTEGER,
    precursor_level NUMERIC,
    sample_size INTEGER NOT NULL DEFAULT 0,
    model_json JSONB,
    last_calibrated_on TIMESTAMPTZ,
    created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (upstream_river_id, downstream_river_id),
    CHECK (upstream_river_id <> downstream_river_id)
);

-- One row per prediction emitted, scored later against what actually happened downstream.
CREATE TABLE IF NOT EXISTS link_predictions (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL REFERENCES river_links(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ NOT NULL,
    predicted_exceedance_at TIMESTAMPTZ NOT NULL,
    upstream_value NUMERIC NOT NULL,
    actual_exceedance_at TIMESTAMPTZ,
    outcome TEXT NOT NULL DEFAULT 'pending',
    created_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_predictions_link_id_predicted_at_idx
    ON link_predictions (link_id, predicted_at DESC);
