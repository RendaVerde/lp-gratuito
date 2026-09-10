const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const lead = { name: '  Teste local  ', phone: '(00) 00000-0000', email: 'teste@example.invalid', city: 'Cidade Teste / XX', interest: 'Energia', profile: 'Minha residência', observation: 'Observação de teste' };

// Todas as chamadas externas são simuladas. Nenhum lead é enviado à planilha.
function harness(options = {}) {
  const beacons = [], requests = [], opened = [], events = [], timers = [];
  const makeElement = () => ({
    listeners: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener(name, fn) { this.listeners[name] = fn; }, setAttribute() {}, focus() {},
    textContent: '', disabled: false,
  });
  const button = { textContent: 'CONTINUAR NO WHATSAPP →', disabled: false };
  const form = makeElement();
  form.checkValidity = () => options.valid !== false;
  form.reportValidity = () => {};
  form.querySelector = () => button;
  const nodes = { leadForm: form, leadModal: makeElement(), toast: makeElement(), phone: makeElement(), name: makeElement() };
  let id = 0;
  const context = vm.createContext({
    URLSearchParams, AbortController, console: { error() {} },
    FormData: class { entries() { return Object.entries(options.data || lead); } },
    document: {
      getElementById(key) { return nodes[key] || null; },
      querySelectorAll() { return []; }, addEventListener() {},
      body: { classList: { add() {}, remove() {} } },
    },
    window: {
      location: { href: 'https://clientes.example.invalid/?utm_source=teste&utm_term=energia&fbclid=fb-test&gclid=g-test', search: '?utm_source=teste&utm_term=energia&fbclid=fb-test&gclid=g-test' },
      crypto: { randomUUID() { return `test-lead-${++id}`; } },
      clarity(action, name) { if (action === 'event') events.push(name); },
      open(...args) { opened.push(args); },
      setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    },
    navigator: options.noBeacon ? {} : { sendBeacon(url, body) { beacons.push({ url, body }); if (options.beaconThrow) throw Error('Beacon bloqueado'); return options.beacon !== false; } },
    fetch: async (url, init) => {
      requests.push({ url, ...init });
      if (options.fetchHandler) return options.fetchHandler(init);
      if (options.fetchReject) throw Error('offline');
      return options.response || { type: 'opaque', ok: false };
    },
  });
  vm.runInContext(script, context);
  return { context, nodes, form, button, beacons, requests, opened, events, timers,
    save: (data = lead) => context.saveLead(data),
    submit: () => form.listeners.submit({ preventDefault() {} }),
  };
}

test('contrato da aba de clientes: payload JSON, tipo e campos em português', async () => {
  const h = harness();
  assert.equal(await h.save(), true);
  assert.equal(h.beacons.length, 1);
  assert.equal(h.requests.length, 0);
  const body = h.beacons[0].body;
  assert.deepEqual([...body.keys()], ['payload']);
  const p = JSON.parse(body.get('payload'));
  assert.equal(p.tipo, 'cliente');
  assert.equal(p.site_id, 'rendaverde-igreen');
  assert.equal(p.landing_id, 'cliente-gratuito-igreen');
  assert.equal(p.nome, 'Teste local');
  assert.equal(p.whatsapp, lead.phone);
  assert.equal(p.email, lead.email);
  assert.equal(p.cidade, lead.city);
  assert.equal(p.interesse, lead.interest);
  assert.equal(p.perfil, lead.profile);
  assert.equal(p.observacao, lead.observation);
  assert.ok(p.lead_id);
  assert.equal(p.utm_source, 'teste');
  assert.equal(p.utm_term, 'energia');
  assert.equal(p.gclid, 'g-test');
  assert.equal(p.fbclid, 'fb-test');
  assert.match(p.page_url, /clientes\.example/);
  assert.equal(p.name, undefined);
  assert.equal(p.lead_type, undefined);
});

test('simulação acompanha observacao e não exige nova coluna no servidor', async () => {
  const h = harness();
  await h.save({ ...lead, simulation: 'Energia: 10 clientes; R$ 20,00.' });
  const p = JSON.parse(h.beacons[0].body.get('payload'));
  assert.equal(p.observacao, lead.observation + '\n\nEnergia: 10 clientes; R$ 20,00.');
});

test('campos extras não substituem o destino nem o tipo de cliente', async () => {
  const h = harness();
  await h.save({ ...lead, tipo: 'licenciado', site_id: 'outro', lead_id: 'externo' });
  const p = JSON.parse(h.beacons[0].body.get('payload'));
  assert.equal(p.tipo, 'cliente');
  assert.equal(p.site_id, 'rendaverde-igreen');
  assert.equal(p.lead_id, 'test-lead-1');
});

for (const [description, config] of [['recusado', { beacon: false }], ['com exceção', { beaconThrow: true }], ['indisponível', { noBeacon: true }]]) {
  test(`Beacon ${description}: fallback envia o mesmo contrato`, async () => {
    const h = harness(config);
    assert.equal(await h.save(), true);
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].method, 'POST');
    assert.equal(h.requests[0].keepalive, true);
    assert.equal(h.requests[0].mode, 'no-cors');
    const p = JSON.parse(h.requests[0].body.get('payload'));
    assert.equal(p.tipo, 'cliente');
    if (h.beacons.length) assert.equal(h.requests[0].body.toString(), h.beacons[0].body.toString());
  });
}

test('falha de rede e erro HTTP legível não são tratados como transmissão bem-sucedida', async () => {
  assert.equal(await harness({ beacon: false, fetchReject: true }).save(), false);
  assert.equal(await harness({ noBeacon: true, response: { type: 'basic', ok: false, status: 500 } }).save(), false);
});

test('POST bloqueado encerra no timeout e permite continuar o atendimento', async () => {
  const h = harness({ noBeacon: true, fetchHandler: ({ signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('timeout')))) });
  const pending = h.save();
  h.timers.find(t => t.delay === 8000).fn();
  assert.equal(await pending, false);
});

test('envio do formulário transporta o lead e preserva a mensagem do WhatsApp', async () => {
  const h = harness();
  await h.submit();
  assert.equal(h.beacons.length, 1);
  assert.equal(h.opened.length, 1);
  const url = new URL(h.opened[0][0]);
  assert.equal(url.hostname, 'wa.me');
  assert.match(url.searchParams.get('text'), /Teste local/);
  assert.ok(h.events.includes('lead_cliente_gratuito_enviado'));
  assert.ok(!h.events.includes('lead_salvo'));
  assert.equal(h.button.disabled, false);
});

test('falha no envio é sinalizada, sem perder os dados que seguem ao WhatsApp', async () => {
  const h = harness({ beacon: false, fetchReject: true });
  await h.submit();
  assert.equal(h.opened.length, 1);
  assert.ok(h.events.includes('lead_cliente_gratuito_envio_falhou'));
  assert.ok(!h.events.includes('lead_cliente_gratuito_enviado'));
  assert.match(h.nodes.toast.textContent, /Não conseguimos enviar/);
  assert.equal(h.button.disabled, false);
});

test('submissões simultâneas não duplicam o cadastro', async () => {
  let finish;
  const h = harness({ noBeacon: true, fetchHandler: () => new Promise(resolve => { finish = resolve; }) });
  const first = h.submit();
  await h.submit();
  assert.equal(h.requests.length, 1);
  finish({ type: 'opaque', ok: false });
  await first;
  assert.equal(h.opened.length, 1);
  assert.equal(h.button.disabled, false);
});

test('formulário inválido não envia nem abre WhatsApp', async () => {
  const h = harness({ valid: false });
  await h.submit();
  assert.equal(h.beacons.length, 0);
  assert.equal(h.opened.length, 0);
});
