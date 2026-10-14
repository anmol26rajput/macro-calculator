// Self-check of the macro math inside index.html. Run: node check.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const src = html.match(/<script id="macros">([\s\S]*?)<\/script>/)[1];
const { macros, extras, bmiInfo, goalPlan } = new Function(`${src}; return { macros, extras, bmiInfo, goalPlan };`)();

// Hand-worked: male 30y 178cm 89kg, desk job + lifts, fat loss.
// BMR 1857.5 -> x1.375 = 2554 -> -20% = 2043 -> 2040 kcal; protein 2.0*89; fat 0.8*89; carbs = rest.
assert.deepEqual(macros({ sex: 'male', age: 30, cm: 178, kg: 89, activity: 1.375, goal: 'lose' }),
  { bmr: 1858, tdee: 2554, kcal: 2040, protein: 178, fat: 71, carbs: 172 });

// Floor: small sedentary woman cutting gets held at BMR (1214 -> 1210), not 1165.
assert.deepEqual(macros({ sex: 'female', age: 25, cm: 160, kg: 50, activity: 1.2, goal: 'lose' }),
  { bmr: 1214, tdee: 1457, kcal: 1210, protein: 100, fat: 40, carbs: 113 });

// Cap: 140 kg at 175 cm -> protein from BMI-30 weight (91.9 kg), not 280 g.
assert.equal(macros({ sex: 'male', age: 35, cm: 175, kg: 140, activity: 1.2, goal: 'lose' }).protein, 184);

// Extras for the same hand-worked case: BMI 89/1.78^2 = 28.1; 1.6-2.2 g/kg; 178/4 meals; 2040*14/1000;
// 89*35 ml; (2040-2554)*7/7700 = -0.47 kg/week.
const me = { sex: 'male', age: 30, cm: 178, kg: 89, activity: 1.375, goal: 'lose' };
assert.deepEqual(extras(me, macros(me)), {
  bmi: 28.1, bmiClass: 'Overweight', proteinRange: [142, 196], proteinPerMeal: 45,
  fibre: 29, waterL: 3.1, kgPerWeek: -0.47,
});
assert.ok(Math.abs(extras(me, macros({ ...me, goal: 'maintain' })).kgPerWeek) < 0.01); // maintenance ≈ no change

// BMI at 178 cm, 89 kg: 89 / 1.78^2 = 28.1. Healthy range 18.5-24.9 (WHO) or 18.5-22.9 (South Asian) x 1.78^2.
assert.deepEqual(bmiInfo(89, 178), { bmi: 28.1, category: 'Overweight', healthyKg: [58.6, 78.9], kgOff: 10.1, cuts: [18.5, 25, 30] });
assert.deepEqual(bmiInfo(89, 178, 'asian'), { bmi: 28.1, category: 'Obese', healthyKg: [58.6, 72.6], kgOff: 16.4, cuts: [18.5, 23, 27.5] });
assert.equal(bmiInfo(70, 178).kgOff, 0);       // 22.1: inside the range
assert.equal(bmiInfo(55, 178).kgOff, -3.6);    // below: 55 - 58.6
assert.equal(bmiInfo(70, 178, 'asian').category, 'Healthy range');
assert.equal(bmiInfo(95, 178).category, 'Obese');   // 29.98 shows as 30.0, so it must read Obese, not Overweight

// Goal weight below current: protein and fat follow the goal weight (2.0 x 80 = 160 g, 0.8 x 80 = 64 g).
const cut80 = { ...me, goalKg: 80 };
assert.equal(macros(cut80).protein, 160);
assert.equal(macros(cut80).fat, 64);
assert.equal(macros(cut80).kcal, 2040);                        // calories don't change, only the gram split
assert.deepEqual(extras(cut80, macros(cut80)).proteinRange, [128, 176]);
assert.equal(macros({ ...me, goal: 'gain', goalKg: 95 }).protein, 160); // gaining: still current weight (1.8 x 89)

// Tight budget: 100y woman, 90 kg, sedentary, cutting -> 1,360 kcal. Protein 180 g + fat 72 g would be 1,368 kcal,
// so fat drops 72 -> 48 g to leave 15% for carbs: 720 + 432 + 52*4 = 1,360.
assert.deepEqual(macros({ sex: 'female', age: 100, cm: 180, kg: 90, activity: 1.2, goal: 'lose' }),
  { bmr: 1364, tdee: 1637, kcal: 1360, protein: 180, fat: 48, carbs: 52 });

// Bulk = 15% surplus: 2554 x 1.15 = 2937 -> 2930.
assert.equal(macros({ ...me, goal: 'bulk' }).kcal, 2930);

// Road to goal: 9 kg at ~0.47 kg/week that slows as weight drops -> roughly 19-24 weeks.
const p80 = goalPlan(cut80);
assert.ok(p80.matches && p80.dir === 'lose' && p80.weeks >= 19 && p80.weeks <= 24, JSON.stringify(p80));
assert.equal(p80.toGo, -9);
assert.equal(p80.tdeeAtGoal, macros({ ...me, kg: 80, goal: 'maintain' }).tdee);
assert.equal(goalPlan({ ...me, goal: 'gain', goalKg: 80 }).matches, false);   // picked gain, goal is below
assert.equal(goalPlan({ ...me, goalKg: 89.2 }).dir, 'there');
assert.equal(goalPlan(me), null);                                             // no goal weight, no plan
const lean = goalPlan({ ...me, goal: 'gain', goalKg: 93 }), bulk = goalPlan({ ...me, goal: 'bulk', goalKg: 93 });
assert.ok(bulk.weeks < lean.weeks, `bulk ${bulk.weeks} vs lean ${lean.weeks}`);   // bulk gets there faster

// Invariants across a sweep of realistic inputs.
let n = 0;
for (const sex of ['male', 'female'])
  for (const kg of [45, 60, 75, 90, 110, 140])
    for (const cm of [150, 165, 180, 195])
      for (const age of [10, 18, 35, 60, 100])
        for (const activity of [1.2, 1.375, 1.55, 1.725])
          for (const goal of ['lose', 'maintain', 'gain', 'bulk']) {
            const r = macros({ sex, age, cm, kg, activity, goal }), at = JSON.stringify({ sex, kg, cm, age, activity, goal, r });
            assert.ok(r.carbs * 4 >= r.kcal * 0.15 - 4, at);   // carbs always get at least ~15%
            assert.ok(Math.abs(r.protein * 4 + r.carbs * 4 + r.fat * 9 - r.kcal) <= 6, at);
            assert.ok(r.fat * 9 >= 0.2 * r.kcal - 9, at);
            assert.ok(r.protein >= 1.6 * Math.min(kg, 30 * (cm / 100) ** 2) - 1 && r.protein <= 2.2 * kg + 1, at);
            if (goal === 'lose') {
              assert.ok(r.kcal >= Math.min(r.tdee, Math.max(r.bmr, sex === 'male' ? 1500 : 1200)) - 10, at);
              assert.ok(r.kcal >= r.tdee * 0.8 - 10 && r.kcal <= r.tdee, at); // deficit is 0-20%, never a crash diet
            }
            const x = extras({ kg, cm }, r);
            assert.ok(x.bmi > 10 && x.bmi < 70 && x.proteinRange[0] <= r.protein && r.protein <= x.proteinRange[1], at);
            assert.ok(goal === 'lose' ? x.kgPerWeek <= 0 : goal === 'gain' || goal === 'bulk' ? x.kgPerWeek > 0 : Math.abs(x.kgPerWeek) < 0.02, at);
            n++;
          }

console.log(`ok - macro math checks passed (${n} sweep cases)`);
