const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = vm.createContext({ window: {} });
for (const name of ["word-bank", "lesson-plan", "phrase-check"]) {
  vm.runInContext(
    fs.readFileSync(__dirname + "/../public/engine/" + name + ".js", "utf8"),
    context,
  );
}
const source = fs.readFileSync(__dirname + "/../public/engine/gamification-engine.js", "utf8");
vm.runInContext(
  source.slice(0, source.indexOf("// 2. SYNTHESIZER")) + "\nwindow.worlds=WORLDS_DATA;",
  context,
);
const { GlideVocabulary, GlideLessonPlan, GlidePhrase, worlds } = context.window;
const folded = (s) => s.normalize("NFKD").replace(/\p{M}/gu, "");
test("each library word matches its complete transcription, while strict prefixes fail", () => {
  assert.ok(GlideVocabulary.all.length >= 400);
  for (const word of GlideVocabulary.all) {
    assert.ok(GlidePhrase.matches(word, folded(word).toUpperCase()), word);
    const prefix = [...word].slice(0, -1).join("");
    assert.equal(GlidePhrase.matches(word, prefix), false, word);
  }
});
test("every fixed exercise in the path requires all its words", () => {
  for (const world of worlds)
    for (const level of world.levels) {
      for (const draw of [0, 0.42, 0.91]) {
        for (const task of GlideLessonPlan.build(level, [], () => draw).tasks.filter(
          (t) => !t.freeReply,
        )) {
          assert.ok(GlidePhrase.matches(task.word, task.word), task.word);
          const words = task.word.trim().split(/\s+/);
          if (words.length > 1)
            assert.equal(
              GlidePhrase.matches(task.word, words.slice(0, -1).join(" ")),
              false,
              task.word,
            );
        }
      }
    }
});
