-- 30 example Community reports: EX-01 to EX-15 from "Room for Both: Example Community Reports" (13 Oct 2026),
-- EX-16 to EX-30 added in other districts. Every one has a note (the "Anything else" field, 140 characters at most).
-- The page shows them with an "Example" tag and the line "Example reports to show how this page works. Not real submissions."
-- Every row carries is_example = true, so all 30 can be removed in one go:
--     DELETE FROM community_post WHERE is_example;
-- Run once in the Neon SQL editor. Safe to run again: it clears the examples first, then loads them.

BEGIN;

ALTER TABLE community_post ADD COLUMN IF NOT EXISTS is_example boolean NOT NULL DEFAULT false;

DELETE FROM community_post WHERE is_example;

-- State and district are matched by slug against the site's own state and district tables
-- (hulu-langat is stored by DOSM as "Ulu Langat").
WITH ex(ref, state_slug, district_slug, species, kind, week, tm, did, worked, note) AS (VALUES
 ('EX-01','selangor','ulu-langat','macaque','turned-up','2026-09-28','early-morning','["took-food","onto-roof"]','[]','Group of about six on the roof at breakfast, took rambutans from the tree by the fence.'),
 ('EX-02','selangor','ulu-langat','macaque','worked','2026-10-05','late-morning','["took-food"]','["latching-lid"]','Clip on the bin lid stopped them pulling rubbish out. Came twice this week, left with nothing.'),
 ('EX-03','selangor','ulu-langat','wild-boar','turned-up','2026-09-21','night','["damaged"]','[]','Dug up part of the vegetable patch near the forest edge overnight.'),
 ('EX-04','selangor','petaling','house-crow','invasive','2026-10-05','evening','["stayed-nearby"]','[]','Large group roosting in the roadside trees every evening, very loud until dark.'),
 ('EX-05','selangor','petaling','common-myna','worked','2026-09-28','early-morning','[]','["stopped-feeding"]','Stopped leaving rice out for the birds. Fewer mynas on the porch within a week.'),
 ('EX-06','selangor','klang','water-monitor','turned-up','2026-09-14','afternoon','["passed-through"]','[]','Large monitor came out of the monsoon drain, crossed the yard and went back in.'),
 ('EX-07','perak','kampar','macaque','turned-up','2026-10-05','midday','["came-inside","took-food"]','[]','One came through the open kitchen window and took bread from the counter.'),
 ('EX-08','kedah','langkawi','macaque','worked','2026-09-14','afternoon','[]','["pet-food-indoors"]','Moved the cat food indoors. They still pass by but no longer come onto the porch.'),
 ('EX-09','melaka','melaka-tengah','snake','turned-up','2026-09-28','evening','["stayed-nearby"]','[]','Seen by the drain near the gate. Kept everyone back and called 999.'),
 ('EX-10','selangor','gombak','macaque','turned-up','2026-10-05','afternoon','["onto-roof","damaged"]','[]','A few climbed onto the porch roof and pulled the rubber off the gutter.'),
 ('EX-11','selangor','gombak','wild-boar','worked','2026-09-21','night','[]','["cleared-undergrowth"]','Cleared the long grass behind the house. No digging since, three weeks now.'),
 ('EX-12','pulau-pinang','timur-laut','house-crow','turned-up','2026-09-28','early-morning','["took-food"]','[]','Tore open the rubbish bags left out before collection and scattered them across the lane.'),
 ('EX-13','pulau-pinang','timur-laut','house-crow','worked','2026-10-05','early-morning','[]','["latching-lid"]','Switched to a bin with a clip-down lid. The bags stay closed now.'),
 ('EX-14','johor','johor-bahru','water-monitor','turned-up','2026-10-05','midday','["stayed-nearby"]','[]','Resting on the warm path by the pond for about an hour, then went back into the water.'),
 ('EX-15','perak','kampar','common-myna','worked','2026-09-21','late-morning','[]','["screens"]','Put mesh over the gap under the roof where they were nesting. No new nest since.'),
 ('EX-16','sabah','kota-kinabalu','house-crow','invasive','2026-10-05','evening','["stayed-nearby"]','[]','Dozens settle on the shoplot roofs near the waterfront around dusk and stay until it is dark.'),
 ('EX-17','sabah','sandakan','macaque','turned-up','2026-09-28','early-morning','["took-food","onto-roof"]','[]','Troop came over from the oil palm edge and raided the fruit tree behind the house before sunrise.'),
 ('EX-18','sarawak','kuching','water-monitor','turned-up','2026-09-21','afternoon','["passed-through"]','[]','Medium monitor swam up the drain at the back of the terrace and climbed out onto the grass.'),
 ('EX-19','sarawak','miri','common-myna','invasive','2026-10-05','midday','["stayed-nearby","took-food"]','[]','Flock working the outdoor food court tables, picking up scraps as soon as people left.'),
 ('EX-20','pahang','kuantan','macaque','worked','2026-09-28','late-morning','["took-food"]','["latching-lid"]','Fitted a latch on the kitchen window. They tried it twice and gave up.'),
 ('EX-21','pahang','kuantan','wild-boar','turned-up','2026-09-14','night','["damaged"]','[]','Rooted up the front lawn and the edge of the garden bed after midnight.'),
 ('EX-22','terengganu','kuala-terengganu','house-crow','worked','2026-10-05','early-morning','[]','["latching-lid"]','Lidded bins along the stall row stopped the crows opening the rubbish bags.'),
 ('EX-23','kelantan','kota-bharu','common-myna','turned-up','2026-09-21','evening','["stayed-nearby"]','[]','Big noisy roost in the trees by the road, with droppings all over the pavement underneath.'),
 ('EX-24','negeri-sembilan','seremban','macaque','turned-up','2026-09-28','afternoon','["came-inside","took-food"]','[]','Came in through the open back door and took fruit off the table.'),
 ('EX-25','johor','batu-pahat','water-monitor','worked','2026-09-14','late-morning','["stayed-nearby"]','["cleared-undergrowth"]','Cleared the overgrown drain edge. It no longer sunbathes on our back wall.'),
 ('EX-26','kedah','kota-setar','snake','turned-up','2026-10-05','night','["passed-through"]','[]','Seen near the back steps after heavy rain. We stayed inside and it moved on by itself.'),
 ('EX-27','perak','kinta','common-myna','worked','2026-09-21','early-morning','[]','["screens"]','Fitted mesh over the roof vent where they were nesting. No new nest this season.'),
 ('EX-28','selangor','kuala-selangor','wild-boar','turned-up','2026-09-28','night','["damaged","passed-through"]','[]','A sow with four piglets crossed near the plantation edge and dug up the roadside verge.'),
 ('EX-29','w-p-kuala-lumpur','kuala-lumpur','house-crow','worked','2026-10-05','midday','[]','["stopped-feeding"]','A neighbour stopped scattering leftovers on the balcony. Far fewer crows gather there now.'),
 ('EX-30','w-p-labuan','labuan','macaque','turned-up','2026-09-14','early-morning','["onto-roof"]','[]','Three on the roof of the shed behind the house, gone within the hour.')
),
sp(slug, english_name) AS (VALUES
 ('macaque','Long-tailed Macaque'),('wild-boar','Wild Boar'),('common-myna','Common Myna'),
 ('house-crow','House Crow'),('water-monitor','Common Water Monitor')
)
INSERT INTO community_post(reference, species_id, district_id, post_kind, week_of, animal_did, what_worked, note, photo_ref, status, submitted_at, is_example)
SELECT ex.ref,
       (SELECT s.species_id FROM species s JOIN sp ON LOWER(s.english_name)=LOWER(sp.english_name) WHERE sp.slug=ex.species LIMIT 1),
       d.district_id,
       ex.kind, ex.week,
       json_build_object('did', ex.did::json, 'time', ex.tm, 'species', ex.species)::text,
       ex.worked, ex.note, NULL, 'published', (ex.week::date + 6)::timestamp, true
FROM ex
JOIN state st    ON lower(regexp_replace(st.state_name,'[^A-Za-z0-9]+','-','g')) = ex.state_slug
JOIN district d  ON d.state_id = st.state_code
                AND lower(regexp_replace(d.name_dosm,'[^A-Za-z0-9]+','-','g')) = ex.district_slug;

-- Must be 30. If it is fewer, a state or district name did not match: run ROLLBACK; and check the names in state and district.
SELECT count(*) AS examples_loaded FROM community_post WHERE is_example;

COMMIT;
