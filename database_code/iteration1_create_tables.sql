CREATE TABLE animal_category (
    category_id INTEGER PRIMARY KEY,
    category_name VARCHAR,
    description TEXT,
    responsible_body_type VARCHAR
);

CREATE TABLE species (
    species_id INTEGER PRIMARY KEY,
    order_family_species VARCHAR,
    scientific_name VARCHAR,
    malay_name VARCHAR,
    english_name VARCHAR,
    category_id INTEGER NOT NULL,
    protected_status VARCHAR,
    introduced_status VARCHAR,
    is_snake BOOLEAN,
    id_keywords TEXT,
    taxonKey VARCHAR,
    CONSTRAINT fk_species_category
        FOREIGN KEY (category_id)
        REFERENCES animal_category(category_id)
);

CREATE TABLE authority (
    authority_id INTEGER PRIMARY KEY,
    jurisdiction VARCHAR,
    category_id INTEGER NOT NULL,
    agency_name VARCHAR,
    contact_route VARCHAR,
    contact_value VARCHAR,
    what_they_do TEXT,
    response_standard TEXT,
    source_url VARCHAR,
    last_verified DATE,
    CONSTRAINT fk_authority_category
        FOREIGN KEY (category_id)
        REFERENCES animal_category(category_id)
);

CREATE TABLE immediate_action (
    action_id INTEGER PRIMARY KEY,
    species_id INTEGER ,
    category_id INTEGER,
    step_order INTEGER,
    action_kind VARCHAR,
    action_text_en TEXT,
    action_text_ms TEXT,
    source_person VARCHAR,
    source_institution VARCHAR,
    source_url VARCHAR,
    date_verified DATE,
    CONSTRAINT fk_immediate_action_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id),
    CONSTRAINT fk_immediate_action_category
        FOREIGN KEY (category_id)
        REFERENCES animal_category(category_id)
);

CREATE TABLE species_behaviour (
    behaviour_id INTEGER PRIMARY KEY,
    species_id INTEGER NOT NULL,
    likely_location TEXT,
    what_moves_it TEXT,
    safe_distance_note TEXT,
    lost_sight_note TEXT,
    source_person VARCHAR,
    source_institution VARCHAR,
    source_url VARCHAR,
    date_verified DATE,
    CONSTRAINT fk_species_behaviour_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id)
);

CREATE TABLE prevention_action (
    prevention_id INTEGER PRIMARY KEY,
    species_id INTEGER,
    category_id INTEGER,
    cause_group VARCHAR,
    action_kind VARCHAR,
    harm_rank INTEGER,
    action_text_en TEXT,
    action_text_ms TEXT,
    housing_type VARCHAR,
    costs_money VARCHAR,
    source_person VARCHAR,
    source_institution VARCHAR,
    source_url VARCHAR,
    date_verified DATE,
    CONSTRAINT fk_prevention_action_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id),
    CONSTRAINT fk_prevention_action_category
        FOREIGN KEY (category_id)
        REFERENCES animal_category(category_id)
);

CREATE TABLE species_media (
    media_id INTEGER PRIMARY KEY,
    species_id INTEGER NOT NULL,
    image_url VARCHAR,
    photographer VARCHAR,
    licence VARCHAR,
    gbif_occurrence_id VARCHAR,
    CONSTRAINT fk_species_media_species
        FOREIGN KEY (species_id)
        REFERENCES species(species_id)
);

CREATE TABLE state (
    state_code INTEGER PRIMARY KEY,
    state_name VARCHAR,
    jurisdiction_type VARCHAR
);