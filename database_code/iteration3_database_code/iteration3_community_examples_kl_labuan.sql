-- Adds the two example reports the main script (iteration3_community_examples.sql) did not load:
-- EX-29 (Kuala Lumpur) and EX-30 (Labuan). The state table names them 'Kuala Lumpur' and 'Labuan', not 'W.P. ...', so here the district
-- is found by its own name only (each name is used by one district). Safe to run again: skips a reference already there.
-- Run in the Neon SQL editor after the main script.

-- 1. What the database calls them (for the record):
SELECT d.district_id, d.name_dosm, d.state_id, s.state_name
FROM district d LEFT JOIN state s ON s.state_code = d.state_id
WHERE d.name_dosm ILIKE '%kuala lumpur%' OR d.name_dosm ILIKE '%labuan%';

-- 2. Load the two reports.
BEGIN;
WITH ex(ref, district_name, species_name, kind, week, tm, did, worked, note) AS (VALUES
 ('EX-29','kuala lumpur','House Crow','worked','2026-10-05','midday','[]','["stopped-feeding"]','A neighbour stopped scattering leftovers on the balcony. Far fewer crows gather there now.'),
 ('EX-30','labuan','Long-tailed Macaque','turned-up','2026-09-14','early-morning','["onto-roof"]','[]','Three on the roof of the shed behind the house, gone within the hour.')
)
INSERT INTO community_post(reference, species_id, district_id, post_kind, week_of, animal_did, what_worked, note, photo_ref, status, submitted_at, is_example)
SELECT ex.ref,
       (SELECT s.species_id FROM species s WHERE LOWER(s.english_name)=LOWER(ex.species_name) LIMIT 1),
       d.district_id,
       ex.kind, ex.week,
       json_build_object('did', ex.did::json, 'time', ex.tm, 'species', CASE ex.species_name WHEN 'House Crow' THEN 'house-crow' ELSE 'macaque' END)::text,
       ex.worked, ex.note, NULL, 'published', (ex.week::date + 6)::timestamp, true
FROM ex
JOIN district d ON LOWER(TRIM(d.name_dosm)) = ex.district_name
WHERE NOT EXISTS (SELECT 1 FROM community_post cp WHERE cp.reference = ex.ref);

-- Must be 30. If not, run ROLLBACK; and send the result of step 1.
SELECT count(*) AS examples_loaded FROM community_post WHERE is_example;
COMMIT;
