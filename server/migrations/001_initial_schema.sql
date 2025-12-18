-- Initial database schema for mesh coverage map

-- Samples table: stores individual coverage samples
CREATE TABLE IF NOT EXISTS samples (
    geohash VARCHAR(8) PRIMARY KEY,
    time BIGINT NOT NULL,
    path TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for prefix queries (6-char geohash for coverage grouping)
CREATE INDEX IF NOT EXISTS idx_samples_geohash_prefix ON samples (LEFT(geohash, 6));
CREATE INDEX IF NOT EXISTS idx_samples_time ON samples (time);

-- Repeaters table: stores repeater locations
CREATE TABLE IF NOT EXISTS repeaters (
    id VARCHAR(2) NOT NULL,
    lat DECIMAL(11,8) NOT NULL,
    lon DECIMAL(11,8) NOT NULL,
    name VARCHAR(255),
    elev DECIMAL(10,2),
    time BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, lat, lon)
);

CREATE INDEX IF NOT EXISTS idx_repeaters_id ON repeaters (id);
CREATE INDEX IF NOT EXISTS idx_repeaters_time ON repeaters (time);

-- Coverage table: aggregated coverage data by 6-char geohash
CREATE TABLE IF NOT EXISTS coverage (
    geohash VARCHAR(6) PRIMARY KEY,
    heard INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    last_heard BIGINT,
    hit_repeaters TEXT[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coverage_last_heard ON coverage (last_heard);

-- Coverage samples junction table: stores individual samples within coverage areas
CREATE TABLE IF NOT EXISTS coverage_samples (
    coverage_geohash VARCHAR(6) NOT NULL REFERENCES coverage(geohash) ON DELETE CASCADE,
    sample_time BIGINT NOT NULL,
    sample_path TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (coverage_geohash, sample_time)
);

CREATE INDEX IF NOT EXISTS idx_coverage_samples_geohash ON coverage_samples (coverage_geohash);

-- Archive table: for historical sample data
CREATE TABLE IF NOT EXISTS archive (
    geohash VARCHAR(8) PRIMARY KEY,
    time BIGINT NOT NULL,
    path TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archive_time ON archive (time);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON samples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repeaters_updated_at BEFORE UPDATE ON repeaters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_updated_at BEFORE UPDATE ON coverage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

