import assert from 'node:assert/strict';
import {containsSnakeTerm,detectPersonalDetail,validateAi3Candidate,validateCommunitySubmission,validateReviewDecision} from '../src/iteration3-validators.js';

assert.equal(validateCommunitySubmission({species:'snake',kind:'invasive',state:'selangor',district:'hulu-langat',week:'2026-09-14',time:'night'}).ok,false);
assert.equal(validateCommunitySubmission({species:'house-crow',kind:'invasive',state:'selangor',district:'hulu-langat',week:'2026-09-14',time:'night',did:[],worked:[]}).ok,true);
assert.equal(detectPersonalDetail('Call me at 012-3456789'),'phone');
assert.equal(detectPersonalDetail('No identifying detail here.'),null);
assert.equal(validateReviewDecision('publish','published').ok,true);
assert.equal(validateReviewDecision('publish','personal-detail').ok,false);
const ai=validateAi3Candidate({species:'macaque',evidence:{species:'monkey'}},'A monkey came onto the roof.');
assert.equal(ai.ok,true);assert.equal(ai.value.species,'macaque');
// a species the sentence does not name is never filled, whatever the model says (U3-5)
const bad=validateAi3Candidate({species:'macaque',evidence:{species:'macaque'}},'Something came onto the roof.');
assert.equal(validateAi3Candidate({},'I saw a tiger yesterday').value.species,undefined);
assert.equal(validateAi3Candidate({},'I saw a tiger yesterday').value.when,undefined);
assert.equal(validateAi3Candidate({species:'house-crow',evidence:{species:'crow birds'}},'8 house crows came to the window').value.species,'house-crow');
assert.equal(detectPersonalDetail('The road near the shop'),null);
assert.equal(detectPersonalDetail('saw 4 on the lane behind us'),null);
assert.equal(detectPersonalDetail('55/5 , mathew street'),'house-number');
assert.equal(detectPersonalDetail('14 Mathew Road'),'house-number');
assert.equal(detectPersonalDetail('12 Jalan Bukit'),'street');
assert.equal(bad.value.species,undefined);
for(const s of ['I saw a python','ada ULAR di dapur','A Cobra came','a long thin thing, slithering']) assert.equal(containsSnakeTerm(s),true,s);
for(const s of ['A regular visitor, macaque on the roof','kera ambil buah']) assert.equal(containsSnakeTerm(s),false,s);
console.log('Iteration 3 validator tests passed');
