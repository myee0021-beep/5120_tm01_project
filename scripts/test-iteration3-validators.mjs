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
const bad=validateAi3Candidate({species:'macaque',evidence:{species:'macaque'}},'A monkey came onto the roof.');
assert.equal(bad.value.species,undefined);
for(const s of ['I saw a python','ada ULAR di dapur','A Cobra came','a long thin thing, slithering']) assert.equal(containsSnakeTerm(s),true,s);
for(const s of ['A regular visitor, macaque on the roof','kera ambil buah']) assert.equal(containsSnakeTerm(s),false,s);
console.log('Iteration 3 validator tests passed');
