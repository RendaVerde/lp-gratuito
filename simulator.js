/* SIMULADOR CLIENTE IGREEN
 * 01. Premissas e cálculo puro (valores monetários em centavos)
 * 02. Interface, validação e eventos
 * Fontes e limitações: docs/simulador.md. Sem perfil de licenciado.
 */
(function () {
  "use strict";

  // 01 · Premissas e cálculo puro
  const SETTINGS = Object.freeze({
    telecomMinimumCents: 5490,
    telecomCashbackCents: 350,
    insuranceBasisPoints: 250, // 2,5%: hipótese da referência fornecida, a confirmar.
    energyBasisPoints: Object.freeze({
      range: [100, 200],
      A: [200, 200],
      B: [100, 100],
      C: [50, 50],
    }),
    maxClients: 1000,
    maxAmount: 100000,
  });

  function calculate(input) {
    for (const key of ["energyCount", "telecomCount", "insuranceCount"]) {
      if (
        !Number.isInteger(input[key]) ||
        input[key] < 0 ||
        input[key] > SETTINGS.maxClients
      ) {
        throw new RangeError(
          "Informe de 0 a 1.000 clientes, sem casas decimais.",
        );
      }
    }
    for (const key of ["energyBase", "insuranceBase", "telecomPlan"]) {
      const value = input[key];
      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > SETTINGS.maxAmount ||
        Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
      ) {
        throw new RangeError(
          "Informe valores entre R$ 0 e R$ 100.000, com até duas casas decimais.",
        );
      }
    }
    const telecomPlanCents = Math.round(input.telecomPlan * 100);
    if (telecomPlanCents < SETTINGS.telecomMinimumCents) {
      throw new RangeError("O plano Telecom deve ser de pelo menos R$ 54,90.");
    }
    if (!Object.hasOwn(SETTINGS.energyBasisPoints, input.energyRule)) {
      throw new RangeError("Selecione uma regra válida de energia.");
    }
    const rates = SETTINGS.energyBasisPoints[input.energyRule];
    const energyCents = Math.round(input.energyBase * 100);
    const insuranceCents = Math.round(input.insuranceBase * 100);
    // Arredondamento por indicação paga; depois soma as indicações da mesma base.
    const energyMin =
      input.energyCount * Math.round((energyCents * rates[0]) / 10000);
    const energyMax =
      input.energyCount * Math.round((energyCents * rates[1]) / 10000);
    const telecom = input.telecomCount * SETTINGS.telecomCashbackCents;
    const insurance =
      input.insuranceCount *
      Math.round((insuranceCents * SETTINGS.insuranceBasisPoints) / 10000);
    return {
      energyMin,
      energyMax,
      telecom,
      insurance,
      totalMin: energyMin + telecom + insurance,
      totalMax: energyMax + telecom + insurance,
      telecomPlanCents,
      telecomRemaining: Math.max(0, telecomPlanCents - telecom),
      telecomCredit: Math.max(0, telecom - telecomPlanCents),
      telecomTarget: Math.ceil(
        telecomPlanCents / SETTINGS.telecomCashbackCents,
      ),
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate, SETTINGS };
  }
  if (typeof document === "undefined") return;

  // 02 · Interface, validação e eventos
  const section = document.getElementById("simulador");
  const panel = section?.querySelector("[data-simulator]");
  if (!panel) return;
  const fields = [...section.querySelectorAll("[data-sim-field]")];
  const contact = section.querySelector("[data-sim-contact]");
  const error = section.querySelector("#sim-error");
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const money = (cents) => currency.format(cents / 100);
  const range = (min, max) =>
    min === max ? money(min) : `${money(min)} a ${money(max)}`;
  let current = null;
  let started = false;
  let changeTimer;

  function trackSimulator(name) {
    if (typeof window.clarity === "function") window.clarity("event", name);
    if (typeof window.gtag === "function")
      window.gtag("event", name, {
        event_category: "simulador_cliente",
        landing_version: "cliente_gratuito_v2_simulador",
      });
  }
  function setText(selector, value) {
    section.querySelector(selector).textContent = value;
  }
  function readInputs() {
    return Object.fromEntries(
      fields.map((field) => [
        field.dataset.simField,
        field.tagName === "SELECT" ? field.value : field.valueAsNumber,
      ]),
    );
  }
  function update() {
    current = null;
    let invalidField = null;
    for (const field of fields) {
      const valid = field.validity.valid;
      field.setAttribute("aria-invalid", String(!valid));
      if (!valid && !invalidField) invalidField = field;
    }
    try {
      if (invalidField)
        throw new RangeError(
          "Revise o campo destacado: clientes de 0 a 1.000, valores até R$ 100.000 e plano Telecom a partir de R$ 54,90. Preencha todos os campos.",
        );
      const input = readInputs();
      const result = calculate(input);
      current = { input, result };
      error.hidden = true;
      error.textContent = "";
      contact.disabled = false;
      setText("[data-sim-total]", range(result.totalMin, result.totalMax));
      setText("[data-sim-energy]", range(result.energyMin, result.energyMax));
      setText("[data-sim-telecom]", money(result.telecom));
      setText("[data-sim-insurance]", money(result.insurance));
      const [minRate, maxRate] = SETTINGS.energyBasisPoints[input.energyRule];
      const percent = (n) => `${String(n / 100).replace(".", ",")}%`;
      setText(
        "[data-sim-rate]",
        minRate === maxRate
          ? percent(minRate)
          : `${percent(minRate)} a ${percent(maxRate)}`,
      );
      const telecomGoal =
        result.telecomRemaining > 0
          ? `Telecom: restam ${money(result.telecomRemaining)} do seu plano de ${money(result.telecomPlanCents)}. Meta para cobri-lo: ${result.telecomTarget} indicações pagas.`
          : `Telecom: plano de ${money(result.telecomPlanCents)} coberto neste cenário. Crédito para próximas faturas: ${money(result.telecomCredit)}.`;
      setText("[data-sim-goal]", telecomGoal);
    } catch (reason) {
      contact.disabled = true;
      error.textContent = reason.message;
      error.hidden = false;
      for (const selector of [
        "[data-sim-total]",
        "[data-sim-energy]",
        "[data-sim-telecom]",
        "[data-sim-insurance]",
      ])
        setText(selector, "—");
      setText(
        "[data-sim-goal]",
        "Revise os campos para atualizar a estimativa.",
      );
    }
    section.querySelectorAll("[data-sim-step]").forEach((button) => {
      const field = document.getElementById(button.dataset.simTarget);
      const count = field.valueAsNumber;
      button.disabled =
        Number(button.dataset.simStep) < 0
          ? count <= 0
          : count >= SETTINGS.maxClients;
    });
  }

  function interacted() {
    update();
    if (!started) {
      started = true;
      trackSimulator("simulador_cliente_iniciado");
    }
    window.clearTimeout(changeTimer);
    changeTimer = window.setTimeout(() => {
      if (current) trackSimulator("simulador_cliente_calculado");
    }, 800);
  }
  fields.forEach((field) => field.addEventListener("input", interacted));
  section.querySelectorAll("[data-sim-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.simTarget);
      const previous = Number.isFinite(field.valueAsNumber)
        ? Math.trunc(field.valueAsNumber)
        : 0;
      field.value = String(
        Math.min(
          SETTINGS.maxClients,
          Math.max(0, previous + Number(button.dataset.simStep)),
        ),
      );
      interacted();
    });
  });
  fields.filter((field) => !field.dataset.simField.endsWith("Count")).forEach((field) => {
    field.addEventListener("change", () => {
      if (current) trackSimulator("simulador_cliente_premissas_alteradas");
    });
  });
  contact.addEventListener("click", () => {
    update();
    if (!current) return;
    const { input, result } = current;
    const summary = [
      "Simulação ilustrativa de indicações (não é renda garantida):",
      `Energia: ${input.energyCount} clientes; base elegível mensal ${money(Math.round(input.energyBase * 100))}; regra ${input.energyRule}; cashback ${range(result.energyMin, result.energyMax)}.`,
      `Telecom: ${input.telecomCount} clientes; cashback fixo de R$ 3,50 por indicação paga; meu plano ${money(result.telecomPlanCents)}; cashback ${money(result.telecom)}.`,
      `Seguros: ${input.insuranceCount} clientes; base elegível mensal ${money(Math.round(input.insuranceBase * 100))}; hipótese de 2,5% a confirmar; cashback ${money(result.insurance)}.`,
      `Soma ilustrativa mensal: ${range(result.totalMin, result.totalMax)}. Quero confirmar bases, taxas e elegibilidade.`,
    ].join("\n");
    trackSimulator("simulador_cliente_atendimento");
    document.dispatchEvent(
      new CustomEvent("igreen:simulation-contact", {
        detail: { summary, trigger: contact },
      }),
    );
  });
  update();
  panel.hidden = false;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackSimulator("simulador_cliente_visualizado");
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(section.querySelector(".simulator-services"));
  }
})();
