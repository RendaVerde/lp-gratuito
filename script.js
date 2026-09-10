/* ========================================================================== 
   LANDING PAGE CLIENTE GRATUITO IGREEN — COMPORTAMENTOS

   Organização do arquivo:
   01. Configuração e referências da interface
   02. Contexto e eventos de analytics
   03. Mensagens de retorno
   04. Modal de captação
   05. Formatação do WhatsApp
   06. Atribuição e mensagem de atendimento
   07. Persistência do lead no Google Sheets
   08. Envio do formulário
   09. Interações das perguntas frequentes
   ========================================================================== */

// 01 · Configuração e referências da interface
// -----------------------------------------------------------------------------
const CONFIG = {
  whatsappNumber: "5527988021747",
  sheetEndpoint:
    "https://script.google.com/macros/s/AKfycbwrCkcX0mvzbihwCQVqYVoKgnTStFOPb6qkco_47DFNLrP6o1LMoOjErDqX5LyYGgH45Q/exec",
  // Identificador da integração existente; a origem desta LP vai em landing_id.
  sheetSiteId: "rendaverde-igreen",
  landingPageId: "cliente-gratuito-igreen",
};

const modal = document.getElementById("leadModal");
const form = document.getElementById("leadForm");
const toast = document.getElementById("toast");
const phoneInput = document.getElementById("phone");
let lastFocusedElement = null;
let activeSimulationSummary = null;
let submissionInProgress = false;

// 02 · Contexto e eventos de analytics
// -----------------------------------------------------------------------------
if (typeof window.clarity === "function") {
  window.clarity("set", "landing_version", "cliente_gratuito_v2_simulador");
  const source = new URLSearchParams(window.location.search).get("utm_source");
  if (source) window.clarity("set", "utm_source", source);
}

function track(name, params = {}) {
  if (typeof window.clarity === "function") window.clarity("event", name);
  if (typeof window.gtag === "function") {
    window.gtag("event", name, {
      event_category: "conversao_cliente",
      ...params,
    });
  }
}

// 03 · Mensagens de retorno
// -----------------------------------------------------------------------------
function showToast(message, duration = 2400) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), duration);
}

// 04 · Modal de captação
// -----------------------------------------------------------------------------
function openModal(event, simulationSummary = null) {
  activeSimulationSummary = simulationSummary;
  lastFocusedElement = event?.currentTarget || document.activeElement;
  modal?.classList.add("is-open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  track("formulario_cliente_gratuito_aberto", {
    cta_text: event?.currentTarget?.textContent?.trim() || "direto",
  });
  window.setTimeout(() => document.getElementById("name")?.focus(), 120);
}

function closeModal() {
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  lastFocusedElement?.focus?.();
}

document.querySelectorAll(".js-open-form").forEach((button) => {
  button.addEventListener("click", openModal);
});
document.addEventListener("igreen:simulation-contact", (event) => {
  openModal({ currentTarget: event.detail.trigger }, event.detail.summary);
});
document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeModal);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open"))
    closeModal();
});

// 05 · Formatação do WhatsApp
// -----------------------------------------------------------------------------
phoneInput?.addEventListener("input", () => {
  let value = phoneInput.value.replace(/\D/g, "").slice(0, 11);
  if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
  if (value.replace(/\D/g, "").length > 10) {
    value = value.replace(/^(\(\d{2}\) \d{5})(\d{0,4})$/, "$1-$2");
  } else {
    value = value.replace(/^(\(\d{2}\) \d{4})(\d{0,4})$/, "$1-$2");
  }
  phoneInput.value = value;
});

// 06 · Atribuição e mensagem de atendimento
// -----------------------------------------------------------------------------
function getUtmData() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
    utm_term: params.get("utm_term") || "",
    gclid: params.get("gclid") || "",
    fbclid: params.get("fbclid") || "",
  };
}

function createWhatsAppLink(data) {
  const message = [
    "Olá! Quero me cadastrar gratuitamente como Cliente Green.",
    "",
    `Nome: ${data.name}`,
    `WhatsApp: ${data.phone}`,
    `E-mail: ${data.email}`,
    `Cidade/UF: ${data.city}`,
    `Interesse principal: ${data.interest}`,
    `Perfil: ${data.profile}`,
  ];
  if (data.observation) message.push(`Observação: ${data.observation}`);
  if (data.simulation) message.push("", data.simulation);
  message.push(
    "",
    "Preenchi o cadastro na página Cliente Gratuito iGreen e quero continuar meu atendimento.",
  );
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message.join("\n"))}`;
}

// 07 · Persistência do lead no Google Sheets
// -----------------------------------------------------------------------------
function createLeadId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createSheetPayload(data) {
  const clean = (value) => String(value ?? "").trim();
  const notes = [clean(data.observation), clean(data.simulation)].filter(Boolean);
  // Mesmo contrato usado pelo formulário de clientes da LP Renda Verde.
  return {
    site_id: CONFIG.sheetSiteId,
    landing_id: CONFIG.landingPageId,
    tipo: "cliente",
    lead_id: createLeadId(),
    nome: clean(data.name),
    whatsapp: clean(data.phone),
    email: clean(data.email),
    cidade: clean(data.city),
    interesse: clean(data.interest),
    perfil: clean(data.profile),
    // A coluna observacao já existe no contrato; preserva também a simulação.
    observacao: notes.join("\n\n"),
    created_at: new Date().toISOString(),
    page_url: window.location.href,
    ...getUtmData(),
  };
}

async function saveLead(data) {
  if (!CONFIG.sheetEndpoint) return false;
  const body = new URLSearchParams();
  body.set("payload", JSON.stringify(createSheetPayload(data)));

  // true significa envio enfileirado/concluído pelo navegador, não linha salva.
  if (navigator.sendBeacon) {
    try {
      if (navigator.sendBeacon(CONFIG.sheetEndpoint, body)) return true;
    } catch {
      // Mesmo se o Beacon lançar uma exceção, tenta o POST abaixo.
    }
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), 8000) : null;
  try {
    const response = await fetch(CONFIG.sheetEndpoint, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true,
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (response.type !== "opaque" && !response.ok) return false;
    return true;
  } catch {
    console.error("Não foi possível transmitir o cadastro à planilha.");
    return false;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
}

// payload é JSON dentro de um formulário URL-encoded, não campos soltos.
// O Apps Script não está neste projeto; sem retorno legível, não emitir lead_salvo.

// 08 · Envio do formulário
// -----------------------------------------------------------------------------
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submissionInProgress) return;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  if (activeSimulationSummary) data.simulation = activeSimulationSummary;
  const phoneDigits = String(data.phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    showToast("Informe um WhatsApp válido.");
    phoneInput?.focus();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;
  submissionInProgress = true;
  submitButton.disabled = true;
  submitButton.textContent = "ABRINDO WHATSAPP...";
  track("lead_cliente_gratuito_envio_tentado", { interest: data.interest });

  try {
    const transmitted = await saveLead(data);
    if (transmitted) {
      track("lead_cliente_gratuito_enviado", { interest: data.interest });
      if (data.simulation) track("simulador_cliente_lead_enviado");
    } else {
      track("lead_cliente_gratuito_envio_falhou");
    }
    const whatsappUrl = createWhatsAppLink(data);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    track("whatsapp_cliente_direcionamento_solicitado");
    showToast(
      transmitted
        ? "Continue seu atendimento no WhatsApp."
        : "Não conseguimos enviar o cadastro à planilha. Seus dados seguem na mensagem do WhatsApp.",
      transmitted ? 2400 : 6500,
    );
  } finally {
    submissionInProgress = false;
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
});

// 09 · Interações das perguntas frequentes
// -----------------------------------------------------------------------------
document.querySelectorAll(".faq-list details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (item.open)
      track("faq_aberta", {
        question: item.querySelector("summary")?.textContent,
      });
  });
});
