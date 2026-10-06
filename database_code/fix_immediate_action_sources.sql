-- Fix broken source links in immediate_action.
-- Every replacement was opened on 6 October 2026 and checked against the step text;
-- the evidence line under each UPDATE is what the new page says.
-- Safe to run more than once: each UPDATE only changes rows that still have the old link.

-- actions 1, 2, 3, 4: Malay Mail, 16 Nov 2025, quotes Noorizun Kechik: no specific anti-venom for coral snakes, advises retreat; "Snakes can sense vibrations ... stay calm"; most bites occur when people engage or attack the snake; never remove a python yourself, call professionals
UPDATE immediate_action SET source_url = 'https://www.malaymail.com/news/malaysia/2025/11/16/know-your-snakes-a-guide-to-malaysias-venomous-reptiles-and-how-to-stay-safe-video/194052'
WHERE action_id IN (1, 2, 3, 4) AND source_url = 'https://www.malaymail.com/news/malaysia/2024/01/16/king-cobra-squad-formed-to-tackle-snake-related-emergencies/112893';

-- actions 6: The Star, 18 Oct 2024, Yusoff Shariff: "children must not provoke the monkeys nor go near them"
UPDATE immediate_action SET source_url = 'https://www.thestar.com.my/metro/metro-news/2024/10/18/perhilitan-stop-feeding-releasing-trapped-monkeys'
WHERE action_id IN (6) AND source_url = 'https://www.thestar.com.my/news/nation/2024/02/20/monkeys-are-wild-animals-dont-feed-or-provoke-them';

-- actions 7: SUSTAINABILITY@UM: "do not attempt to touch, play with, or provoke macaques"
UPDATE immediate_action SET source_url = 'https://sustainability.um.edu.my/news/balancing-coexistence-and-conservation-addressing-the-human-macaque-conflict-at-universiti-malaya'
WHERE action_id IN (7) AND source_url = 'https://www.um.edu.my/news/monkey-encounter-guide';

-- actions 8: Ada Monyet!? guide: relaxed posture and alert gaze, the hiker can calmly pass by; avoid sudden movements
UPDATE immediate_action SET source_url = 'https://langurprojectpenang.com/ada-monyet-monkey-encounter-guide/'
WHERE action_id IN (8) AND source_url = 'https://www.langurprojectpenang.com/encounter-guide';

-- actions 9: LPP FAQ: "Only call PERHILITAN as your last resort in this case, to avoid potential culling"
UPDATE immediate_action SET source_url = 'https://langurprojectpenang.com/2020/08/22/faq/'
WHERE action_id IN (9) AND source_url = 'https://www.langurprojectpenang.com/faq';

-- actions 12, 13: AVS: "Do not touch, chase, or corner the wild boars, especially if there are piglets"; injured/distressed/trapped -> trained professionals
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/wildlife/encountering-wildlife/wild-boars/'
WHERE action_id IN (12, 13) AND source_url = 'https://www.nparks.gov.sg/avs/wildlife/wild-boars';

-- actions 16, 17: AVS bird flu: "not to touch or handle any wild birds - this would include crows, pigeons, mynahs"; "do not approach, feed, or touch them"
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/about-us/what-we-do/animal-health/bird-flu/'
WHERE action_id IN (16, 17) AND source_url = 'https://www.nparks.gov.sg/avs/diseases/avian-influenza';

-- actions 20, 21: AVS: "Do not touch, chase, or corner the crow. Observe the crow from a distance."; injured/distressed -> trained professionals
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/wildlife/encountering-wildlife/house-crows-pigeons-javan-mynas/house-crows/'
WHERE action_id IN (20, 21) AND source_url = 'https://www.nparks.gov.sg/avs/wildlife/house-crows';

-- actions 22, 23: Sinar Harian, Wan Mohd Adib Wan Mohd Yusoh: "berhati-hati ... dan tidak mengambil tindakan sendirian. Sebarang aduan dan maklumat boleh disalurkan kepada Perhilitan"
UPDATE immediate_action SET source_url = 'https://www.sinarharian.com.my/article/689127/edisi/selangor-kl/bukan-buaya-tetapi-biawak-di-tasik-seksyen-7'
WHERE action_id IN (22, 23) AND source_url = 'https://www.sinarharian.com.my/article/123457/biawak';

-- actions 24, 25: AVS: "Stay calm"; "Do not touch, chase or corner the monitor lizard"; "Keep a safe distance ... observe it from afar"; injured -> trained professionals
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/wildlife/encountering-wildlife/monitor-lizards/'
WHERE action_id IN (24, 25) AND source_url = 'https://www.nparks.gov.sg/avs/wildlife/monitor-lizards';

-- actions 26, 28: AVS: "please observe birds and animals from a safe distance; do not approach, feed, or touch them"
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/about-us/what-we-do/animal-health/bird-flu/'
WHERE action_id IN (26, 28) AND source_url = 'https://www.nparks.gov.sg/-/media/avs/avs-eguide_feb-2024-new-v2.pdf';

-- actions 29, 30: AVS: "do not attempt to pick it up"; "call the 24-hour Animal Response Centre helpline"
UPDATE immediate_action SET source_url = 'https://avs.nparks.gov.sg/wildlife/wildlife-management/centre-for-wildlife-rehabilitation/'
WHERE action_id IN (29, 30) AND source_url = 'https://www.nparks.gov.sg/avs/wildlife/wildlife-rehabilitation';

-- actions 31: PERHILITAN Sistem e-Aduan: complaints via wildlife.spab.gov.my or hotline 1-800-88-5151
UPDATE immediate_action SET source_url = 'https://www.wildlife.gov.my/sistem-e-aduan/'
WHERE action_id IN (31) AND source_url = 'https://www.wildlife.gov.my/index.php/en/faq';

-- actions 32: NParks: "Contact our Animal Response Centre (1800 476 1600) if you have further queries about animal encounters"
UPDATE immediate_action SET source_url = 'https://www.nparks.gov.sg/visit/when-visiting-parks/when-encountering-animals'
WHERE action_id IN (32) AND source_url = 'https://www.nparks.gov.sg/avs/wildlife/biodiversity';

-- actions 33: MyGov official page for the NG MERS 999 emergency line
UPDATE immediate_action SET source_url = 'https://www.malaysia.gov.my/en/topics/mers-999-emergency-line'
WHERE action_id IN (33) AND source_url = 'https://www.malaysia.gov.my/portal/content/30943';

-- Not changed: no page was found that carries the cited advice from the cited person/institution.
--   5      The Star 2024/01/17 (404), Ahmad Khaldun Ismail: no Star article found with 'do not wait for symptoms / no folk remedies'.
--   10, 11 Sinar Harian article/123456 (placeholder id, opens an unrelated article), Salman Saaban, Johor PERHILITAN, wild boar.
--   27     NParks e-guide PDF (404): 'stay calm and move away slowly' as general advice (only species pages say this).
--   34     ResearchGate (blocked to automated checks; a conference abstract, unlikely to carry first-aid advice).
-- Option for 5 and 34 (changes the attribution, so it is left for the team to decide):
--   The Malaysian Medical Gazette article already used by actions 35-37 says 'Reduce movement of the limb affected
--   by the snake bite' and to seek medical care rather than home remedies. To use it, also change source_person and
--   source_institution on those rows to Dr Abdul Rahman Abdul Kadir / The Malaysian Medical Gazette.
-- Still fine as they are: 14, 15, 18, 19 (DVS Melaka), 35-37 (MMGazette), 38-40 (iProperty, opens in a browser).
