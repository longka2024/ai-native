import assert from 'node:assert/strict';

await import('../content-creation-base.js');
const {
  buildWritingBrief,
  diagnoseDraft,
  diagnoseDbsContent,
  diagnoseAiFingerprints,
  runEditorialReview,
  WRITING_FRAMEWORKS,
} = globalThis.LongkaContentCreationBase;

const source = {
  title: '淡斑前，一定要先搞清楚这4种斑点类型',
  content: '很多用户在淡斑前分不清斑点类型，容易跟风买精华、刷酸或做项目。源头帖互动高，适合拆成判断标准和避坑内容。',
  metrics: { likes: 1898, saves: 1664, comments: 57, shares: 286 },
  comments: [
    '我脸上这个到底是晒斑还是黄褐斑？',
    '为什么我用了淡斑精华还是没效果？',
    '做皮秒会不会反黑？',
  ],
};

const titles = [
  '别急着买淡斑精华，先分清这几种斑',
  '淡斑前先自查：你脸上的斑是哪一种',
  '评论区问最多的：我脸上到底是哪种斑？',
  '皮肤科视角：不同斑点的成因和改善思路',
  '长斑10年才知道：斑点类型不同，淡斑思路天差地别',
  '你淡斑一直没效果，可能不是精华没用',
];

const briefs = titles.map((title) => buildWritingBrief({
  source,
  title,
  industry: '美业护肤',
  keyword: '淡斑',
  goal: '持续产出能带来咨询的内容',
}));

function unique(values) {
  return [...new Set(values)];
}

assert.equal(Object.keys(WRITING_FRAMEWORKS).length >= 6, true, 'writing framework library should include at least 6 models');
assert.equal(briefs.length, 6);
assert.equal(unique(briefs.map((item) => item.trigger.id)).length >= 4, true, 'titles should map to multiple title triggers');
assert.equal(unique(briefs.map((item) => item.framework.id)).length >= 4, true, 'titles should map to multiple writing frameworks');
assert.equal(unique(briefs.map((item) => item.writingRoute)).length >= 4, true, 'titles should map to multiple writing routes');
assert.equal(unique(briefs.map((item) => item.cta)).length >= 4, true, 'titles should map to different CTAs');

for (const brief of briefs) {
  assert.ok(brief.selectedQuestion, `brief missing selectedQuestion for ${brief.title}`);
  assert.ok(brief.framework.id, `brief missing framework for ${brief.title}`);
  assert.ok(brief.framework.paragraphs.length >= 4, `framework paragraphs too short for ${brief.title}`);
  assert.ok(brief.structure.length >= 4, `route structure too short for ${brief.title}`);
  assert.ok(brief.avoid.some((item) => item.includes('虚构')), `brief should include fabrication guard for ${brief.title}`);
  assert.ok(brief.draftInstruction.some((item) => item.includes('写作模型')), `brief should expose writing model for ${brief.title}`);
}

const badDraft = `姐妹们，我长斑快10年了，以前总跟风买淡斑精华。
1. 雀斑
2. 晒斑
3. 黄褐斑
4. 褐青色痣
5. 混合斑
我们中心现在有免费的皮肤检测，可以帮你分析。`;
const review = diagnoseDraft(badDraft, briefs[4]);
assert.equal(review.ok, false, 'bad draft should fail quality gate');
assert.ok(review.rewriteDirections.length >= 2, 'bad draft should return rewrite directions');

const dbsReview = diagnoseDbsContent(badDraft, briefs[4]);
assert.equal(dbsReview.ok, false, 'bad draft should fail DBS content review');
assert.ok(dbsReview.dimensions.some((item) => item.name === 'AI 辅助工作流' && !item.ok), 'bad draft should fail AI workflow dimension');

const aiReview = diagnoseAiFingerprints(badDraft);
assert.equal(aiReview.ok, false, 'bad draft should fail AI fingerprint review');
assert.ok(aiReview.fingerprints.some((item) => item.id === 'fake_story'), 'bad draft should hit fake story fingerprint');
assert.ok(aiReview.fingerprints.some((item) => item.id === 'fake_authority'), 'bad draft should hit fake authority fingerprint');

const editorialRound1 = runEditorialReview({ draft: badDraft, brief: briefs[4], round: 1 });
assert.equal(editorialRound1.passed, false, 'bad draft should not pass editorial review');
assert.equal(editorialRound1.nextAction, 'rewrite_once', 'round 1 bad draft should request one rewrite');
assert.ok(editorialRound1.rewriteBrief.length >= 3, 'editorial review should return concrete rewrite brief');

const editorialRound3 = runEditorialReview({ draft: badDraft, brief: briefs[4], round: 3 });
assert.equal(editorialRound3.passed, false, 'bad draft should still fail at round 3');
assert.equal(editorialRound3.shouldStop, true, 'round 3 should stop');
assert.equal(editorialRound3.nextAction, 'return_to_topic_or_source', 'round 3 failure should return to topic/source');

console.log('PASS content creation base creates distinct writing briefs');
for (const brief of briefs) {
  console.log(`- ${brief.title}`);
  console.log(`  trigger=${brief.trigger.name} framework=${brief.framework.id} route=${brief.writingRoute}`);
  console.log(`  question=${brief.selectedQuestion}`);
  console.log(`  cta=${brief.cta}`);
}
console.log(`PASS bad draft blocked: ${review.blockers?.join(' / ') || review.rewriteDirections.join(' / ')}`);
console.log('PASS DBS editorial loop blocks bad drafts and stops after 3 rounds');
