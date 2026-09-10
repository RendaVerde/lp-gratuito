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
  sheetSiteId: "cliente-gratuito-igreen",
};

const modal = document.getElementById("leadModal");
const form = document.getElementById("leadForm");
const toast = document.getElementById("toast");
const phoneInput = document.getElementById("phone");
let lastFocusedElement = null;

// 02 · Contexto e eventos de analytics
// -----------------------------------------------------------------------------
if (typeof window.clarity === "function") {
  window.clarity("set", "landing_version", "cliente_gratuito_v1");
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
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

// 04 · Modal de captação
// -----------------------------------------------------------------------------
function openModal(event) {
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
  message.push(
    "",
    "Preenchi o cadastro na página Cliente Gratuito iGreen e quero continuar meu atendimento.",
  );
  return `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message.join("\n"))}`;
}

// 07 · Persistência do lead no Google Sheets
// -----------------------------------------------------------------------------
async function saveLead(data) {
  if (!CONFIG.sheetEndpoint) return false;
  const payload = {
    site_id: CONFIG.sheetSiteId,
    lead_type: "cliente_gratuito",
    created_at: new Date().toISOString(),
    page_url: window.location.href,
    ...getUtmData(),
    ...data,
  };
  const body = new URLSearchParams(payload);
  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(CONFIG.sheetEndpoint, body);
      if (sent) return true;
    }
    await fetch(CONFIG.sheetEndpoint, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error("Não foi possível registrar o lead.", error);
    return false;
  }
}

// 08 · Envio do formulário
// -----------------------------------------------------------------------------
form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const phoneDigits = String(data.phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    showToast("Informe um WhatsApp válido.");
    phoneInput?.focus();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = "ABRINDO WHATSAPP...";

  track("lead_cliente_gratuito_enviado", { interest: data.interest });
  await saveLead(data);
  const whatsappUrl = createWhatsAppLink(data);
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");

  submitButton.disabled = false;
  submitButton.textContent = originalLabel;
  showToast("Cadastro preparado. Continue no WhatsApp.");
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
