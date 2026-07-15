-- Follow-up to seed-rivers.sql: stronger Reno upstream predictors + the Sillaro chain, and drop
-- Gallo as a Reno predictor (history shows it does not lead Gandazzolo: 31/34 events lead=0).
-- Idempotent; soglie from the allertameteo sensor list.

INSERT INTO rivers (station_id, river_name, station_name, soglia1, soglia2, soglia3) VALUES
    -- Reno (extra upstream)
    ('3095', 'Reno',    'Casalecchio chiusa',       0.8,  1.6,  2.2),
    ('3141', 'Reno',    'Bonconvento',              7.5, 10,   11.5),
    -- Sillaro
    ('3102', 'Sillaro', 'Castel San Pietro',        1,    1.3,  1.7),
    ('3131', 'Sillaro', 'Sesto Imolese',           11.5, 12.8, 14.5),
    ('3132', 'Sillaro', 'Portonovo',               10.3, 11.8, 13),
    ('5304', 'Sillaro', 'Chiavica Bastia Sillaro',  8.7, 11,   12.7)
ON CONFLICT (station_id) DO NOTHING;

INSERT INTO river_links (upstream_river_id, downstream_river_id)
SELECT u.id, d.id
FROM (VALUES
    ('3095', '3149'), ('3141', '3149'),                    -- Reno -> Gandazzolo Reno
    ('3102', '5304'), ('3131', '5304'), ('3132', '5304')   -- Sillaro -> Chiavica Bastia Sillaro
) AS pair(up, down)
JOIN rivers u ON u.station_id = pair.up
JOIN rivers d ON d.station_id = pair.down
ON CONFLICT (upstream_river_id, downstream_river_id) DO NOTHING;

-- Gallo does not precede Gandazzolo; keep the station for monitoring but drop the prediction link.
DELETE FROM river_links
WHERE upstream_river_id = (SELECT id FROM rivers WHERE station_id = '3120')
  AND downstream_river_id = (SELECT id FROM rivers WHERE station_id = '3149');
