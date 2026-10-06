-- Fix broken source links on the long-tailed macaque immediate actions.
-- Each replacement was opened and checked against the action text on 6 October 2026,
-- and is the same link prevention_action / attractant_rule already use for that source.
-- Safe to run more than once: each UPDATE only touches the row while it still has the old link.

-- action 6: "Keep children from approaching or provoking monkeys." (Yusoff Shariff, Perak PERHILITAN)
-- The Star, 18 Oct 2024: "children must not provoke the monkeys nor go near them"
UPDATE immediate_action
SET source_url = 'https://www.thestar.com.my/metro/metro-news/2024/10/18/perhilitan-stop-feeding-releasing-trapped-monkeys'
WHERE action_id = 6
  AND source_url = 'https://www.thestar.com.my/news/nation/2024/02/20/monkeys-are-wild-animals-dont-feed-or-provoke-them';

-- action 7: "Do not touch, play with or provoke a macaque..." (UM Sustainable Development Centre with PERHILITAN)
-- SUSTAINABILITY@UM: "do not attempt to touch, play with, or provoke macaques"
UPDATE immediate_action
SET source_url = 'https://sustainability.um.edu.my/news/balancing-coexistence-and-conservation-addressing-the-human-macaque-conflict-at-universiti-malaya'
WHERE action_id = 7
  AND source_url = 'https://www.um.edu.my/news/monkey-encounter-guide';

-- action 8: "If one is nearby, pass calmly..." (Langur Project Penang, Ada Monyet!? Encounter Guide)
-- Guide: "recognising the macaque's relaxed posture and alert gaze, the hiker can calmly pass by"
UPDATE immediate_action
SET source_url = 'https://langurprojectpenang.com/ada-monyet-monkey-encounter-guide/'
WHERE action_id = 8
  AND source_url = 'https://www.langurprojectpenang.com/encounter-guide';

-- action 9: "Call the Perhilitan hotline, 1800 88 5151, only as a last resort..." (Langur Project Penang, FAQ)
-- FAQ: "Only call PERHILITAN as your last resort in this case, to avoid potential culling"
UPDATE immediate_action
SET source_url = 'https://langurprojectpenang.com/2020/08/22/faq/'
WHERE action_id = 9
  AND source_url = 'https://www.langurprojectpenang.com/faq';

-- Still to fix (no working link for these sources anywhere in the code or git history;
-- needs the team's own source):
--   actions 10, 11 (wild boar)     https://www.sinarharian.com.my/article/123456/babi-hutan   placeholder id, opens an unrelated article
--   actions 22, 23 (water monitor) https://www.sinarharian.com.my/article/123457/biawak       placeholder id, opens an unrelated article
--   actions 12, 13 (wild boar)     https://www.nparks.gov.sg/avs/wildlife/wild-boars          404
--   actions 16, 17 (common myna)   https://www.nparks.gov.sg/avs/diseases/avian-influenza     404
--   actions 20, 21 (house crow)    https://www.nparks.gov.sg/avs/wildlife/house-crows         404
--   actions 24, 25 (water monitor) https://www.nparks.gov.sg/avs/wildlife/monitor-lizards     404
