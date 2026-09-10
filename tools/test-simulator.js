const { test } = require("node:test");
const assert = require("node:assert/strict");
const { calculate } = require("../simulator.js");

const scenario = { energyCount: 10, telecomCount: 10, insuranceCount: 10, energyBase: 200, insuranceBase: 200, telecomPlan: 54.90, energyRule: "range" };

test("exemplo inicial, soma e abatimento usam centavos", () => {
  const r = calculate(scenario);
  assert.equal(r.energyMin, 2000);
  assert.equal(r.energyMax, 4000);
  assert.equal(r.insurance, 5000);
  assert.equal(r.telecom, 3500);
  assert.equal(r.totalMin, 10500);
  assert.equal(r.totalMax, 12500);
  assert.equal(r.telecomRemaining, 1990);
  assert.equal(r.telecomTarget, 16);
});

test("reproduz o exemplo da imagem com bases de R$ 500 e R$ 300", () => {
  const r = calculate({ ...scenario, energyBase: 500, insuranceBase: 300 });
  assert.equal(r.totalMin, 16000);
  assert.equal(r.totalMax, 21000);
});

test("mudar preço do plano não muda cashback fixo; não soma outros produtos ao abatimento", () => {
  const r = calculate({ ...scenario, telecomPlan: 109.90, energyCount: 1000, insuranceCount: 1000 });
  assert.equal(r.telecom, 3500);
  assert.equal(r.telecomRemaining, 7490);
  assert.equal(r.telecomTarget, 32);
});

test("15 indicações não cobrem R$ 54,90; 16 cobrem e deixam crédito de R$ 1,10", () => {
  assert.equal(calculate({ ...scenario, telecomCount: 15 }).telecomRemaining, 240);
  const r = calculate({ ...scenario, telecomCount: 16 });
  assert.equal(r.telecomRemaining, 0);
  assert.equal(r.telecomCredit, 110);
});

test("zero indicações é zero cashback, mesmo com bases positivas", () => {
  const r = calculate({ ...scenario, energyCount: 0, telecomCount: 0, insuranceCount: 0 });
  assert.equal(r.totalMax, 0);
  assert.equal(r.totalMin, 0);
  assert.equal(r.telecomRemaining, 5490);
});

test("regras A, B e rural usam os percentuais corretos", () => {
  for (const [energyRule, expected] of [["A", 4000], ["B", 2000], ["C", 1000]]) {
    const r = calculate({ ...scenario, energyRule });
    assert.equal(r.energyMin, expected);
    assert.equal(r.energyMax, expected);
  }
});

test("arredondamento acontece por indicação, sem resíduos de ponto flutuante", () => {
  const r = calculate({ ...scenario, insuranceBase: 103.47, energyBase: 178.23 });
  assert.equal(r.insurance, 2590);
  assert.equal(r.energyMin, 1780);
  assert.equal(r.energyMax, 3560);
});

test("entradas inválidas nunca viram projeções plausíveis", () => {
  for (const patch of [
    { energyCount: -1 }, { telecomCount: 1.5 }, { insuranceCount: 1001 },
    { energyCount: NaN }, { energyCount: "10" }, { energyBase: Infinity },
    { insuranceBase: -100 }, { energyBase: 200.001 }, { insuranceBase: 100001 },
    { telecomPlan: 35 }, { telecomPlan: NaN }, { energyRule: "toString" },
  ]) assert.throws(() => calculate({ ...scenario, ...patch }), RangeError);
});

test("limites máximos mantêm resultados inteiros e seguros", () => {
  const r = calculate({ ...scenario, energyCount: 1000, telecomCount: 1000, insuranceCount: 1000, energyBase: 100000, insuranceBase: 100000, telecomPlan: 100000 });
  assert.equal(r.totalMax, 450350000);
  assert.ok(Object.values(r).every(Number.isSafeInteger));
});
