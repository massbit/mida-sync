-- Prevent duplicate alert_reports rows when concurrent scheduler ticks
-- or manual route invocations race on the same report_number.
-- Apply manually on production after deduping existing rows, e.g.:
--
--   DELETE FROM alert_reports a
--   USING alert_reports b
--   WHERE a.id < b.id
--     AND a.report_number = b.report_number;
--
ALTER TABLE alert_reports
    ADD CONSTRAINT alert_reports_report_number_key UNIQUE (report_number);
