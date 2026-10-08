CREATE TABLE district (
    district_id INT PRIMARY KEY,
    state_id INT REFERENCES state(state_code),
    name_dosm TEXT,
    adm2_code TEXT,
    population INT,
    population_year DATE,
    source_url TEXT,
    date_verified DATE
);

CREATE TABLE community_post (
    id INT PRIMARY KEY,
    reference TEXT,
    species_id INT REFERENCES species(species_id),
    district_id INT REFERENCES district(district_id),
    post_kind TEXT,
    week_of TEXT,
    animal_did TEXT,
    what_worked TEXT,
    note TEXT,
    photo_ref TEXT,
    status TEXT,
    submitted_at TIMESTAMP
);

CREATE TABLE review_log (
    id INT PRIMARY KEY,
    community_post_id INT REFERENCES community_post(id),
    decision TEXT,
    reason_code TEXT,
    reviewer_role TEXT,
    decided_at TIMESTAMP
);

CREATE TABLE admin_key (
    id INT PRIMARY KEY,
    key_hash TEXT,
    created_at TIMESTAMP,
    status TEXT
);