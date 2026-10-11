# AI 3 test sets (D50)

Two sets for Report from your words and the note check. Both are run by a member who did not write the code (Maggie or Nisuri), and the result table they write goes into the Test Plan, section 6.

From the project root, with Node 20 or later:

## AI3-T2, the note check (no cost, a few seconds)

```
node tests/ai3/run-ai3-t2.mjs "Your name"
```

30 notes in `ai3-t2-notes.json`: 5 with a telephone number, 10 with another identifying detail, 15 clean. Each goes through the check the Worker runs on submit (`detectPersonalDetail`). Pass: every telephone note held, at least 9 of the other 10 held. Clean notes held by mistake are recorded with no mark.

## AI3-T1, Report from your words (calls the model, about 10 minutes)

```
node tests/ai3/run-ai3-t1.mjs "Your name"
```

50 sentences in `ai3-t1-sentences.json`, each with the fill it should get, sent to `POST /api/community/parse` on the final address, three runs. Pass, on the lowest of the three runs: at most 5 wrong fills in 100 filled fields, nothing filled where the sentence says nothing, no species on a snake sentence, no value outside the option lists.

How a reply is scored: every filled value counts as one filled field. It is correct if it is the expected value or listed under `ok`; otherwise it is wrong. A wrong value in a field the sentence says nothing about is also counted as "filled where the sentence says nothing". A blank field is never wrong. "Yesterday" is counted as this week, or last week when the run is on a Monday (Malaysia time).

## Output

Each script writes `results/ai3-t1-<date>.md` / `results/ai3-t2-<date>.md` (the table for the Test Plan) and a `.json` with every reply.

Do not change the sets after a run to make it pass. If the team agrees a label is wrong, change it, note why in the commit, and run the set again.
