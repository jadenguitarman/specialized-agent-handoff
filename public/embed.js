(() => {
  'use strict';

  const script = document.currentScript || [...document.scripts].find((candidate) => /(?:^|\/)embed\.js(?:\?|$)/.test(candidate.src));
  if (!script || document.querySelector('[data-specialized-agent-handoff-widget]')) return;

  const apiBase = (script.dataset.apiBase || new URL(script.src, document.baseURI).origin).replace(/\/$/u, '');
  const config = Object.freeze({
    apiBase,
    title: script.dataset.title || 'Ask the specialists',
    intro: script.dataset.intro || 'Start with Sales. If your question needs account help, we can bring Support into the same conversation.',
    userId: script.dataset.userId || 'demo-user-01',
    tenantId: script.dataset.tenantId || 'article-demo',
    plan: script.dataset.plan || 'growth',
    position: script.dataset.position === 'left' ? 'left' : 'right',
  });

  const host = document.createElement('div');
  host.dataset.specializedAgentHandoffWidget = 'true';
  host.setAttribute('aria-label', 'Specialized agent chat');
  document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; }
      .widget { color: #28332d; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; -webkit-font-smoothing: antialiased; }
      .launcher { align-items: center; background: #273a31; border: 0; border-radius: 999px; bottom: 24px; box-shadow: 0 12px 30px rgba(24, 47, 36, .24), 0 2px 5px rgba(24, 47, 36, .18); color: #fff; cursor: pointer; display: flex; height: 58px; justify-content: center; position: fixed; ${config.position}: 24px; transition: transform 140ms ease, background-color 140ms ease, box-shadow 140ms ease; width: 58px; z-index: 2147483000; }
      .launcher:hover { background: #1d2f27; box-shadow: 0 15px 34px rgba(24, 47, 36, .28), 0 2px 5px rgba(24, 47, 36, .18); transform: translateY(-2px); }
      .launcher:active { transform: scale(.96); }
      .launcher:focus-visible, button:focus-visible, textarea:focus-visible { outline: 3px solid #d99a4b; outline-offset: 3px; }
      .launcher svg { height: 25px; width: 25px; }
      .unread { background: #e27a55; border: 3px solid #fff; border-radius: 50%; height: 13px; position: absolute; right: 0; top: 0; width: 13px; }
      .panel { background: #fbfaf7; border: 1px solid rgba(39, 58, 49, .12); border-radius: 22px; bottom: 94px; box-shadow: 0 24px 70px rgba(26, 48, 38, .2), 0 3px 12px rgba(26, 48, 38, .1); display: flex; flex-direction: column; max-height: min(680px, calc(100vh - 120px)); opacity: 0; overflow: hidden; pointer-events: none; position: fixed; ${config.position}: 24px; transform: translateY(10px) scale(.98); transform-origin: bottom ${config.position}; transition: opacity 150ms ease, transform 150ms ease; width: min(382px, calc(100vw - 32px)); z-index: 2147482999; }
      .panel.open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
      .header { background: #273a31; color: #fff; padding: 19px 18px 17px; }
      .header-row { align-items: flex-start; display: flex; justify-content: space-between; gap: 12px; }
      .eyebrow { color: #b9d0bf; font-size: 10px; font-weight: 700; letter-spacing: .13em; margin: 0 0 6px; text-transform: uppercase; }
      h2 { color: #fff; font-family: Georgia, serif; font-size: 24px; font-weight: 500; letter-spacing: -.025em; line-height: 1.05; margin: 0; text-wrap: balance; }
      .close { align-items: center; background: transparent; border: 0; border-radius: 8px; color: #dce9de; cursor: pointer; display: flex; height: 36px; justify-content: center; margin: -5px -5px 0 0; width: 36px; }
      .close:hover { background: rgba(255,255,255,.1); color: #fff; }
      .active { align-items: center; color: #dce9de; display: flex; font-size: 11px; gap: 7px; margin-top: 14px; }
      .dot { background: #9acc9c; border-radius: 50%; height: 7px; width: 7px; }
      .messages { background: #f5f2ec; display: flex; flex: 1; flex-direction: column; gap: 12px; min-height: 170px; overflow-y: auto; padding: 17px 15px; }
      .message { display: flex; gap: 8px; max-width: 91%; }
      .message.user { align-self: flex-end; flex-direction: row-reverse; }
      .avatar { align-items: center; background: #dbe9dc; border-radius: 50%; color: #385944; display: flex; flex: 0 0 28px; font-size: 11px; font-weight: 800; height: 28px; justify-content: center; width: 28px; }
      .user .avatar { background: #e7d7bd; color: #694d2e; }
      .bubble-wrap { min-width: 0; }
      .meta { color: #7a857d; font-size: 10px; margin: 2px 0 4px; }
      .user .meta { text-align: right; }
      .bubble { background: #fff; border-radius: 4px 14px 14px 14px; box-shadow: 0 1px 2px rgba(35, 55, 43, .06); color: #354139; font-size: 13px; line-height: 1.45; padding: 10px 12px; white-space: pre-wrap; }
      .user .bubble { background: #e4eee2; border-radius: 14px 4px 14px 14px; }
      .welcome { color: #657269; font-size: 12px; line-height: 1.45; margin: auto; max-width: 285px; padding: 20px 4px; text-align: center; }
      .welcome strong { color: #34443a; display: block; font-family: Georgia, serif; font-size: 18px; font-weight: 500; margin-bottom: 5px; }
      .status { background: #f5f2ec; border-top: 1px solid rgba(39,58,49,.08); color: #657269; font-size: 11px; min-height: 30px; padding: 8px 15px 0; }
      .status.error { color: #a24c3d; }
      .composer { background: #fbfaf7; border-top: 1px solid rgba(39,58,49,.1); padding: 12px 14px 13px; }
      textarea { background: #fff; border: 1px solid rgba(39,58,49,.18); border-radius: 12px; color: #28332d; display: block; font: inherit; font-size: 13px; line-height: 1.4; min-height: 63px; padding: 10px 11px; resize: vertical; width: 100%; }
      textarea::placeholder { color: #9aa39c; }
      .composer-actions { align-items: center; display: flex; gap: 8px; justify-content: space-between; margin-top: 9px; }
      .send, .handoff, .cancel { border: 0; border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 700; min-height: 38px; padding: 0 13px; transition: transform 140ms ease, background-color 140ms ease, opacity 140ms ease; }
      .send { background: #d99a4b; color: #2e291f; }
      .send:hover { background: #e2a75e; }
      .handoff { background: #e8efe5; color: #3d5e46; flex: 1; }
      .handoff:hover { background: #dbe9dc; }
      .cancel { background: transparent; color: #9a574c; padding: 0 5px; }
      .send:active, .handoff:active, .cancel:active { transform: scale(.96); }
      button:disabled, textarea:disabled { cursor: wait; opacity: .58; }
      .footer-note { color: #8a948d; font-size: 10px; line-height: 1.3; margin-top: 9px; }
      .config { color: #78847b; font-size: 10px; line-height: 1.35; margin-top: 7px; }
      .config.ready { color: #4c7956; }
      .config.missing { color: #a24c3d; }
      .hidden { display: none !important; }
      @media (prefers-reduced-motion: reduce) { .launcher, .panel, .send, .handoff, .cancel { transition: none; } }
      @media (max-width: 480px) { .launcher { bottom: 16px; ${config.position}: 16px; } .panel { bottom: 84px; ${config.position}: 8px; max-height: calc(100vh - 100px); width: calc(100vw - 16px); } }
    </style>
    <div class="widget">
      <button class="launcher" type="button" aria-expanded="false" aria-controls="specialized-agent-panel" aria-label="Open specialist chat">
        <span class="unread"></span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.5 6.75A2.75 2.75 0 0 1 8.25 4h7.5a2.75 2.75 0 0 1 2.75 2.75v5.5A2.75 2.75 0 0 1 15.75 15H12l-3.8 3v-3H8.25a2.75 2.75 0 0 1-2.75-2.75v-5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.75h6M9 12.25h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <section class="panel" id="specialized-agent-panel" role="dialog" aria-modal="false" aria-labelledby="specialized-agent-title" aria-hidden="true">
        <header class="header"><div class="header-row"><div><p class="eyebrow">Application-owned routing</p><h2 id="specialized-agent-title"></h2></div><button class="close" type="button" aria-label="Close specialist chat"><svg viewBox="0 0 24 24" fill="none" width="19" height="19" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div><div class="active"><span class="dot"></span><span class="active-label">Sales agent</span></div></header>
        <div class="messages" aria-live="polite"></div>
        <div class="status" role="status"></div>
        <form class="composer"><textarea rows="2" aria-label="Message the active agent" placeholder="Ask about plans or implementation…"></textarea><div class="composer-actions"><button class="handoff" type="button">Switch to Support <span aria-hidden="true">→</span></button><button class="send" type="submit">Send</button><button class="cancel hidden" type="button">Cancel</button></div><div class="footer-note">Sales and Support are separate agents. The application transfers only approved context.</div><div class="config">Checking server configuration…</div></form>
      </section>
    </div>
  `;

  const elements = {
    launcher: shadow.querySelector('.launcher'),
    unread: shadow.querySelector('.unread'),
    panel: shadow.querySelector('.panel'),
    close: shadow.querySelector('.close'),
    title: shadow.querySelector('h2'),
    active: shadow.querySelector('.active-label'),
    messages: shadow.querySelector('.messages'),
    status: shadow.querySelector('.status'),
    form: shadow.querySelector('form'),
    input: shadow.querySelector('textarea'),
    send: shadow.querySelector('.send'),
    handoff: shadow.querySelector('.handoff'),
    cancel: shadow.querySelector('.cancel'),
    config: shadow.querySelector('.config'),
  };
  elements.title.textContent = config.title;

  const state = {
    open: false,
    agent: 'sales',
    messages: [],
    conversationId: `embed_${crypto.randomUUID()}`,
    pending: null,
    lastFocus: null,
  };
  const context = { userId: config.userId, tenantId: config.tenantId, plan: config.plan };

  function setStatus(message, error = false) {
    elements.status.textContent = message || '';
    elements.status.classList.toggle('error', error);
  }

  function addMessage(role, content, agent = state.agent) {
    state.messages.push({ role, content, agent });
  }

  function render() {
    elements.active.textContent = `${state.agent === 'sales' ? 'Sales' : 'Support'} agent`;
    elements.handoff.classList.toggle('hidden', state.agent !== 'sales');
    elements.messages.replaceChildren();
    if (!state.messages.length) {
      const welcome = document.createElement('div');
      welcome.className = 'welcome';
      welcome.innerHTML = '<strong>Start with Sales</strong><span></span>';
      welcome.querySelector('span').textContent = config.intro;
      elements.messages.append(welcome);
    } else {
      for (const message of state.messages) {
        const row = document.createElement('article');
        row.className = `message ${message.role}`;
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.textContent = message.role === 'user' ? 'Y' : message.agent === 'sales' ? 'S' : 'P';
        const wrap = document.createElement('div');
        wrap.className = 'bubble-wrap';
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = message.role === 'user' ? 'You' : `${message.agent === 'sales' ? 'Sales' : 'Support'} agent`;
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = message.content;
        wrap.append(meta, bubble);
        row.append(avatar, wrap);
        elements.messages.append(row);
      }
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }
  }

  function setPending(pending) {
    state.pending = pending;
    const busy = Boolean(pending);
    elements.input.disabled = busy;
    elements.send.disabled = busy;
    elements.handoff.disabled = busy;
    elements.cancel.classList.toggle('hidden', !busy);
    elements.cancel.disabled = !busy;
  }

  function summary() {
    return state.messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content).join(' | ').slice(0, 600) || 'No prior question has been recorded.';
  }

  async function request(path, body, controller) {
    const response = await fetch(`${config.apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || 'The request could not be completed.');
      error.code = payload.error || 'request_failed';
      throw error;
    }
    return payload;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const content = elements.input.value.trim();
    if (!content || state.pending) return;
    addMessage('user', content);
    elements.input.value = '';
    render();
    const controller = new AbortController();
    setPending({ controller });
    setStatus(`Contacting ${state.agent === 'sales' ? 'Sales' : 'Support'}…`);
    try {
      const response = await request('/api/chat', { agent: state.agent, conversationId: state.conversationId, messages: state.messages.slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent })) }, controller);
      addMessage('assistant', response.content, response.agent);
      setStatus('Response received.');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Request cancelled.' : error.message, true);
    } finally {
      setPending(null);
      render();
    }
  }

  async function handoff() {
    if (state.pending) return;
    const latestQuestion = state.messages.filter((message) => message.role === 'user').at(-1)?.content;
    if (!latestQuestion) {
      setStatus('Ask Sales a question before switching to Support.', true);
      return;
    }
    const controller = new AbortController();
    setPending({ controller });
    setStatus('Validating the destination and transferring approved context…');
    try {
      const response = await request('/api/handoff', { destination: 'support', sourceAgent: state.agent, conversationId: state.conversationId, latestQuestion, summary: summary(), context }, controller);
      state.agent = 'support';
      addMessage('assistant', response.content, 'support');
      setStatus('Handoff complete. Support is now active.');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Handoff cancelled. Sales remains active.' : `${error.message} Sales remains active; you can retry.`, true);
    } finally {
      setPending(null);
      render();
    }
  }

  function setOpen(open) {
    state.open = open;
    elements.panel.classList.toggle('open', open);
    elements.panel.inert = !open;
    elements.panel.setAttribute('aria-hidden', String(!open));
    elements.launcher.setAttribute('aria-expanded', String(open));
    elements.unread.classList.toggle('hidden', open);
    if (open) {
      state.lastFocus = document.activeElement;
      window.setTimeout(() => elements.input.focus(), 0);
    } else if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
  }

  elements.launcher.addEventListener('click', () => setOpen(!state.open));
  elements.close.addEventListener('click', () => setOpen(false));
  elements.form.addEventListener('submit', sendMessage);
  elements.handoff.addEventListener('click', handoff);
  elements.cancel.addEventListener('click', () => state.pending?.controller.abort());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && state.open) setOpen(false); });
  elements.panel.inert = true;

  async function loadConfig() {
    try {
      const response = await fetch(`${config.apiBase}/api/config`, { headers: { Accept: 'application/json' } });
      const provider = await response.json();
      elements.config.textContent = provider.configured ? 'Connected to Agent Studio · agent IDs remain server-side.' : 'Provider not configured · add the server-side values before using the demo.';
      elements.config.classList.toggle('ready', Boolean(provider.configured));
      elements.config.classList.toggle('missing', !provider.configured);
    } catch {
      elements.config.textContent = 'Chat server unavailable · check the configured API base.';
      elements.config.classList.add('missing');
    }
  }

  render();
  void loadConfig();
})();
