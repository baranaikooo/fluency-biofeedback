const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  vm = require("vm");
const sandbox = { module: { exports: {} } };
vm.runInNewContext(
  fs.readFileSync(__dirname + "/../public/engine/lesson-plan.js", "utf8"),
  sandbox,
);
const planner = sandbox.module.exports;
const source = fs.readFileSync(__dirname + "/../public/engine/gamification-engine.js", "utf8");
const worldScope = {};
vm.runInNewContext(
  source.slice(0, source.indexOf("// 2. SYNTHESIZER")) + "\nthis.worlds=WORLDS_DATA;",
  worldScope,
);
test("all 25 lessons use one length and three rounds", () => {
  let count = 0;
  for (const w of worldScope.worlds)
    for (const level of w.levels) {
      count++;
      {
        const plan = planner.build(level, [], () => 0);
        assert.equal(plan.tasks.length, planner.isBoss(level) ? 16 : 12);
        assert.equal(new Set(plan.tasks.map((t) => t.id)).size, plan.tasks.length);
        assert.equal(new Set(plan.tasks.map((t) => t.round)).size, 3);
        assert.ok(plan.tasks.every((t) => t.word && t.mode && t.attempts === 0));
      }
    }
  assert.equal(count, 25);
});
test("word lessons include phrases then free sentences; scenario lessons use distinct questions", () => {
  for (const w of worldScope.worlds)
    for (const level of w.levels) {
      const plan = planner.build(level, [], () => 0);
      if (level.mode === "standard") {
        assert.ok(plan.tasks.some((t) => t.kind === "phrase"));
        assert.ok(
          plan.tasks
            .filter((t) => t.round === 2)
            .every((t) => t.freeReply && t.kind === "sentence"),
        );
      } else {
        assert.equal(new Set(plan.tasks.map((t) => t.questionId)).size, plan.tasks.length);
        assert.ok(plan.tasks.every((t) => t.freeReply));
      }
    }
});
