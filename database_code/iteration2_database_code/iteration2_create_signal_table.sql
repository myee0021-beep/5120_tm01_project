CREATE TABLE signal_threshold (
    id INT PRIMARY KEY,
    indicator TEXT,
    band_low INT,
    band_med INT,
    band_high INT,
    decision_ref TEXT,
    record_threshold INT
);