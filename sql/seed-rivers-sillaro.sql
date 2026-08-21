-- Follow-up to seed-rivers-extra.sql: move the Sillaro prediction target from Chiavica Bastia
-- Sillaro to Portonovo. Idempotent.
--
-- Chiavica Bastia is a sluice at the Reno confluence: its level is gate-regulated, not just a
-- function of what comes down the Sillaro, and in six years of history it clears its soglia1 in
-- only 22 half-hourly readings. Calibration read those isolated samples as ~12 events per link and
-- fitted noise — lead times pinned at the edge of the 48h lookback window and precursor levels down
-- in ordinary flow (Sesto Imolese warning at 7.55 m against a 7.12-7.55 m dry-August baseline).
--
-- Portonovo is a channel gauge one step upstream (lat 44.528 vs 44.578) with 1592 readings above
-- its 10.3 m soglia1 over the same period, so the two gauges above it can actually be shown to
-- lead it. Chiavica Bastia stays registered for threshold monitoring, like Gallo: only its
-- prediction links go.

INSERT INTO river_links (upstream_river_id, downstream_river_id)
SELECT u.id, d.id
FROM (VALUES
    ('3102', '3132'), ('3131', '3132')   -- Castel San Pietro, Sesto Imolese -> Portonovo
) AS pair(up, down)
JOIN rivers u ON u.station_id = pair.up
JOIN rivers d ON d.station_id = pair.down
ON CONFLICT (upstream_river_id, downstream_river_id) DO NOTHING;

DELETE FROM river_links
WHERE downstream_river_id = (SELECT id FROM rivers WHERE station_id = '5304');
