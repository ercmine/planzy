import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("places postgis migration", () => {
    it("declares required foundation tables and geospatial indexes", () => {
        const file = resolve(process.cwd(), "db/migrations/202603100001_perbug_places_postgis_foundation.sql");
        const sql = readFileSync(file, "utf8");
        expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS postgis");
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS canonical_places");
        expect(sql).toContain("geo_point GEOGRAPHY(Point, 4326)");
        expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_canonical_places_geo_point_gist");
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS place_source_records");
        expect(sql).toContain("UNIQUE (source_name, source_record_id)");
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS place_source_attributions");
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS source_category_mappings");
    });
    it("declares OSM sync runs and freshness tracking columns", () => {
        const file = resolve(process.cwd(), "db/migrations/202603100002_osm_ingestion_sync_foundation.sql");
        const sql = readFileSync(file, "utf8");
        expect(sql).toContain("CREATE TABLE IF NOT EXISTS place_import_runs");
        expect(sql).toContain("ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ");
        expect(sql).toContain("ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ");
        expect(sql).toContain("ADD COLUMN IF NOT EXISTS stale_at TIMESTAMPTZ");
        expect(sql).toContain("ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMPTZ");
    });
});
