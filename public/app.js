const context = Object.freeze({ userId: 'demo-user-01', tenantId: 'northstar-demo', plan: 'growth' });
const state = {
  agent: 'sales',
  messages: [],
  conversationId: `demo_${crypto.randomUUID()}`,
  pending: null,
  handoffDraft: null,
};

const elements = {
  messages: document.querySelector('#messages'),
  activeAgent: document.querySelector('#active-agent'),
  form: document.querySelector('#chat-form'),
  input: document.querySelector('#message-input'),
  send: document.querySelector('#send-button'),
  handoff: document.querySelector('#handoff-button'),
  cancel: document.querySelector('#cancel-button'),
  banner: document.querySelector('#handoff-banner'),
  composerNote: document.querySelector('#composer-note'),
  packetSize: document.querySelector('#packet-size'),
  packetMeter: document.querySelector('#packet-meter-fill'),
  activityEmpty: document.querySelector('#activity-empty'),
  activityList: document.querySelector('#activity-list'),
  configPanel: document.querySelector('#config-panel'),
  configMessage: document.querySelector('#config-message'),
};

function makeMessage(role, content, agent = state.agent) {
  return { id: `msg_${crypto.randomUUID()}`, role, content, agent };
}

function render() {
  elements.activeAgent.textContent = state.agent === 'sales' ? 'Sales' : 'Support';
  elements.composerNote.textContent = `Messages go to the ${state.agent === 'sales' ? 'active' : 'current'} agent.`;
  elements.handoff.classList.toggle('hidden', state.agent !== 'sales');
  elements.messages.innerHTML = '';
  if (!state.messages.length) {
    elements.messages.innerHTML = '<div class="empty-state"><div><strong>Start with Sales</strong><span>Ask about a plan, an implementation, or your team’s needs.</span></div></div>';
  } else {
    for (const message of state.messages) {
      const article = document.createElement('article');
      article.className = `message ${message.role}`;
      const agentLabel = message.role === 'user' ? 'You' : `${message.agent === 'sales' ? 'Sales' : 'Support'} agent`;
      article.innerHTML = `<div class="avatar">${message.role === 'user' ? 'Y' : message.agent === 'sales' ? 'S' : 'P'}</div><div class="bubble-wrap"><div class="message-meta">${agentLabel}</div><div class="bubble"></div></div>`;
      article.querySelector('.bubble').textContent = message.content;
      elements.messages.append(article);
    }
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
  updatePacketSize();
}

function updatePacketSize() {
  const draft = state.handoffDraft || {
    latestQuestion: state.messages.filter((message) => message.role === 'user').at(-1)?.content || '—',
    summary: makeSummary(),
    context,
  };
  const size = new TextEncoder().encode(JSON.stringify(draft)).length;
  elements.packetSize.textContent = `${size} bytes`;
  elements.packetMeter.style.width = `${Math.min(100, Math.max(18, size / 20))}%`;
}

function makeSummary() {
  const recent = state.messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content);
  return recent.length ? recent.join(' | ').slice(0, 600) : 'No prior question has been recorded.';
}

function setBanner(message, kind = 'info') {
  elements.banner.textContent = message;
  elements.banner.classList.toggle('hidden', !message);
  elements.banner.classList.toggle('error', kind === 'error');
}

function setPending(pending) {
  state.pending = pending;
  const busy = Boolean(pending);
  elements.send.disabled = busy;
  elements.handoff.disabled = busy;
  elements.input.disabled = busy;
  elements.cancel.classList.toggle('hidden', !busy);
  elements.cancel.disabled = !busy;
}

function storeActivity(activity) {
  const key = 'specialized-agent-handoff.activity';
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  current.unshift(activity);
  localStorage.setItem(key, JSON.stringify(current.slice(0, 10)));
  renderActivity();
}

function renderActivity() {
  const activities = JSON.parse(localStorage.getItem('specialized-agent-handoff.activity') || '[]');
  elements.activityEmpty.classList.toggle('hidden', activities.length > 0);
  elements.activityList.innerHTML = activities.map((activity) => {
    const status = activity.status === 'completed' ? 'Completed' : activity.status === 'cancelled' ? 'Cancelled' : 'Needs recovery';
    return `<div class="activity-item"><strong>${status} → Support</strong><p>${activity.latencyMs ? `${activity.latencyMs} ms · ` : ''}${activity.contextBytes || 0} bytes · ${new Date(activity.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>`;
  }).join('');
}

async function request(path, body, controller) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Request failed.');
    error.code = payload.error || 'request_failed';
    throw error;
  }
  return payload;
}

async function sendMessage(event) {
  event.preventDefault();
  const content = elements.input.value.trim();
  if (!content || state.pending) return;
  const userMessage = makeMessage('user', content);
  state.messages.push(userMessage);
  elements.input.value = '';
  render();
  const controller = new AbortController();
  setPending({ controller, kind: 'chat' });
  setBanner(`Contacting ${state.agent === 'sales' ? 'Sales' : 'Support'}…`);
  try {
    const response = await request('/api/chat', {
      agent: state.agent,
      messages: state.messages.slice(-12).map(({ id, role, content: messageContent }) => ({ id, role, content: messageContent })),
    }, controller);
    state.messages.push(makeMessage('assistant', response.content, response.agent));
    setBanner('Response received.');
  } catch (error) {
    if (error.name === 'AbortError') setBanner('Request cancelled.', 'error');
    else setBanner(error.message, 'error');
  } finally {
    setPending(null);
    render();
  }
}

function buildHandoff() {
  const latestQuestion = state.messages.filter((message) => message.role === 'user').at(-1)?.content;
  if (!latestQuestion) throw new Error('Ask Sales a question before switching to Support.');
  return { latestQuestion, summary: makeSummary(), context };
}

async function handoff() {
  if (state.pending) return;
  let packet;
  try { packet = buildHandoff(); } catch (error) { setBanner(error.message, 'error'); return; }
  state.handoffDraft = packet;
  const startedAt = performance.now();
  const controller = new AbortController();
  setPending({ controller, kind: 'handoff' });
  setBanner('Validating destination and transferring the approved packet…');
  try {
    const response = await request('/api/handoff', {
      destination: 'support',
      sourceAgent: state.agent,
      conversationId: state.conversationId,
      ...packet,
    }, controller);
    const activity = { status: 'completed', latencyMs: response.handoff?.latencyMs || Math.round(performance.now() - startedAt), contextBytes: response.handoff?.contextBytes, at: new Date().toISOString() };
    storeActivity(activity);
    state.agent = 'support';
    state.messages.push(makeMessage('assistant', response.content, 'support'));
    setBanner('Handoff complete. Support is now the active agent.');
  } catch (error) {
    const status = error.name === 'AbortError' ? 'cancelled' : 'recovery';
    storeActivity({ status, contextBytes: new TextEncoder().encode(JSON.stringify(packet.context)).length, at: new Date().toISOString() });
    setBanner(error.name === 'AbortError' ? 'Handoff cancelled. Sales remains active.' : `${error.message} Sales remains active; you can retry.`, 'error');
  } finally {
    setPending(null);
    render();
  }
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    elements.configPanel.classList.add(config.configured ? 'ready' : 'missing');
    elements.configMessage.textContent = config.configured
      ? 'Provider ready · agent IDs remain server-side.'
      : 'Provider not configured · add the server-side values from .env.example.';
  } catch {
    elements.configPanel.classList.add('missing');
    elements.configMessage.textContent = 'Server unavailable · start the local app to connect to Agent Studio.';
  }
}

elements.form.addEventListener('submit', sendMessage);
elements.handoff.addEventListener('click', handoff);
elements.cancel.addEventListener('click', () => state.pending?.controller.abort());
renderActivity();
render();
loadConfig();
