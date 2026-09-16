-- 1. Search miss
CREATE TABLE search_miss (
    id INT PRIMARY KEY,
    day DATE,
    route TEXT,
    count INT
);
-- 2. Attractant rule
CREATE TABLE attractant_rule (
    id INT PRIMARY KEY,
    answer_id TEXT,
    species_id INT NOT NULL,
    source_url TEXT,
    date_verified DATE,

    CONSTRAINT fk_attractant_rule_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id)
);
-- 3. Complaint series
CREATE TABLE complaint_series (
    id INT PRIMARY KEY,
    species_id INT,
    state_code INT,
    year INT,
    cases INT,
    source_url TEXT,
    date_verified DATE,

    CONSTRAINT fk_complaint_series_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id),

    CONSTRAINT fk_complaint_series_state
        FOREIGN KEY (state_code)
        REFERENCES state(state_code)
);