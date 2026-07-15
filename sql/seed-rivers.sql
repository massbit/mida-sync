-- Seed the Molinella stations of interest and their flood-prediction links.
-- Source: allertameteo get-sensor-values-no-time (variable B13215); soglie of 0 mean "no official
-- threshold" and are stored as NULL. Idempotent: safe to re-run.

INSERT INTO rivers (station_id, river_name, station_name, soglia1, soglia2, soglia3) VALUES
    -- Reno
    ('3149', 'Reno',     'Gandazzolo Reno',   12.5, 14.8, 17),
    ('3120', 'Reno',     'Gallo',              9.3, 12,   13.7),
    ('3098', 'Reno',     'Cento',              5.5,  7,    8.7),
    -- Idice
    ('3130', 'Idice',    'S. Antonio',        10.5, 12.2, 13.7),
    ('3100', 'Idice',    'Pizzocalvo',         0.5,  0.7,  1),
    ('3128', 'Idice',    'Castenaso',          8,    9.2, 11),
    -- Quaderna
    ('3155', 'Quaderna', 'Massarolo',         18,   19.3, 20),
    ('5303', 'Quaderna', 'Centonara',       NULL, NULL, NULL),
    ('11102','Quaderna', 'Palesio',            0.9,  1.3,  1.7),
    -- Savena (monitoring only: no upstream station provided, so no prediction link)
    ('3150', 'Savena',   'Gandazzolo Savena', 12.5, 14,   15)
ON CONFLICT (station_id) DO NOTHING;

-- Upstream -> downstream prediction links (target_threshold defaults to soglia 1).
INSERT INTO river_links (upstream_river_id, downstream_river_id)
SELECT u.id, d.id
FROM (VALUES
    ('3120', '3149'), ('3098', '3149'),   -- Reno
    ('3100', '3130'), ('3128', '3130'),   -- Idice
    ('5303', '3155'), ('11102', '3155')   -- Quaderna
) AS pair(up, down)
JOIN rivers u ON u.station_id = pair.up
JOIN rivers d ON d.station_id = pair.down
ON CONFLICT (upstream_river_id, downstream_river_id) DO NOTHING;
