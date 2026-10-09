(() => {
  'use strict';

  const script = document.currentScript || [...document.scripts].find((candidate) => /(?:^|\/)embed\.js(?:\?|$)/u.test(candidate.src));
  if (!script || document.querySelector('[data-specialized-agent-handoff-widget]')) return;

  const apiBase = (script.dataset.apiBase || new URL(script.src, document.baseURI).origin).replace(/\/$/u, '');
  const config = Object.freeze({
    apiBase,
    openMode: script.dataset.open === 'desktop' ? 'desktop' : 'click',
    userId: script.dataset.userId || 'demo-user-01',
    tenantId: script.dataset.tenantId || 'article-demo',
    plan: script.dataset.plan || 'growth',
    position: script.dataset.position === 'left' ? 'left' : 'right',
  });
  const labels = Object.freeze({ sales: 'Sales', support: 'Support' });

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
      .desktop-persistent .launcher { display: none; }
      .desktop-persistent .panel { border-radius: 0; bottom: 0; max-height: none; opacity: 1; pointer-events: auto; right: 0; top: 0; transform: none; width: min(520px, 44vw); }
      .desktop-persistent .close { display: none; }
      .panel-top { align-items: center; background: #273a31; display: flex; gap: 9px; padding: 10px 12px; }
      .view-switcher { display: grid; flex: 1; gap: 6px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .view-option { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.2); border-radius: 9px; color: #dce9de; cursor: pointer; font: 600 10px/1.2 Inter, ui-sans-serif, system-ui, sans-serif; min-height: 42px; padding: 7px 8px; text-align: left; transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease; }
      .view-option:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.35); color: #fff; }
      .view-option[aria-checked="true"] { background: #dbe9dc; border-color: #dbe9dc; color: #273a31; }
      .view-option:active { transform: scale(.96); }
      .close { align-items: center; background: transparent; border: 0; border-radius: 8px; color: #dce9de; cursor: pointer; display: flex; flex: 0 0 36px; height: 36px; justify-content: center; width: 36px; }
      .close:hover { background: rgba(255,255,255,.1); color: #fff; }
      .messages { background: #f5f2ec; display: flex; flex: 1; flex-direction: column; gap: 12px; min-height: 170px; overflow-y: auto; padding: 17px 15px; }
      .conversation-label, .transfer-event { align-self: center; color: #78847b; font: 500 10px/1.3 Inter, ui-sans-serif, system-ui, sans-serif; letter-spacing: .02em; max-width: 90%; padding: 3px 8px; text-align: center; }
      .conversation-label { margin: 1px auto 5px; }
      .transfer-event { color: #a27a47; }
      .transfer-event.complete { color: #4c7956; }
      .transfer-event.error, .transfer-event.cancelled { color: #a24c3d; }
      .message { display: flex; gap: 8px; max-width: 91%; }
      .message.user { align-self: flex-end; flex-direction: row-reverse; }
      .avatar { align-items: center; background: #dbe9dc; border-radius: 50%; color: #385944; display: flex; flex: 0 0 28px; font-size: 11px; font-weight: 800; height: 28px; justify-content: center; width: 28px; }
      .user .avatar { background: #e7d7bd; color: #694d2e; }
      .bubble-wrap { min-width: 0; }
      .meta { color: #7a857d; font-size: 10px; margin: 2px 0 4px; }
      .user .meta { text-align: right; }
      .bubble { background: #fff; border-radius: 4px 14px 14px 14px; box-shadow: 0 1px 2px rgba(35, 55, 43, .06); color: #354139; font-size: 13px; line-height: 1.5; padding: 10px 12px; }
      .user .bubble { background: #e4eee2; border-radius: 14px 4px 14px 14px; white-space: pre-wrap; }
      .bubble p { margin: 0 0 9px; }
      .bubble p:last-child { margin-bottom: 0; }
      .bubble h3 { color: #28332d; font: 600 14px/1.25 Georgia, serif; margin: 0 0 7px; }
      .bubble ul, .bubble ol { margin: 5px 0 9px; padding-left: 19px; }
      .bubble li + li { margin-top: 4px; }
      .bubble code { background: #eef1eb; border-radius: 4px; color: #3d5e46; font: 12px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; padding: 2px 4px; }
      .bubble pre { background: #273a31; border-radius: 9px; color: #f6f5ef; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; margin: 8px 0; overflow-x: auto; padding: 10px; white-space: pre-wrap; }
      .bubble pre code { background: transparent; color: inherit; padding: 0; }
      .bubble a { color: #3d6950; text-decoration: underline; text-underline-offset: 2px; }
      .status { background: #f5f2ec; border-top: 1px solid rgba(39,58,49,.08); color: #657269; font-size: 11px; padding: 8px 15px 0; }
      .status:empty { display: none; }
      .status.error { color: #a24c3d; }
      .composer { background: #fbfaf7; border-top: 1px solid rgba(39,58,49,.1); padding: 12px 14px 13px; }
      textarea { background: #fff; border: 1px solid rgba(39,58,49,.18); border-radius: 12px; color: #28332d; display: block; font: inherit; font-size: 13px; line-height: 1.4; min-height: 63px; padding: 10px 11px; resize: vertical; width: 100%; }
      textarea::placeholder { color: #9aa39c; }
      .composer-actions { align-items: center; display: flex; gap: 8px; justify-content: flex-end; margin-top: 9px; }
      .send, .cancel { border: 0; border-radius: 9px; cursor: pointer; font-size: 11px; font-weight: 700; min-height: 38px; padding: 0 13px; transition: transform 140ms ease, background-color 140ms ease, opacity 140ms ease; }
      .send { background: #d99a4b; color: #2e291f; }
      .send:hover { background: #e2a75e; }
      .cancel { background: transparent; color: #9a574c; padding: 0 5px; }
      .send:active, .cancel:active { transform: scale(.96); }
      button:disabled, textarea:disabled { cursor: wait; opacity: .58; }
      .hidden { display: none !important; }
      @media (prefers-reduced-motion: reduce) { .launcher, .panel, .view-option, .send, .cancel { transition: none; } }
      @media (max-width: 767px) { .desktop-persistent .launcher { display: flex; } .desktop-persistent .panel { border-radius: 22px; bottom: 84px; max-height: calc(100vh - 100px); opacity: 0; pointer-events: none; right: 8px; top: auto; transform: translateY(10px) scale(.98); width: calc(100vw - 16px); } .desktop-persistent .panel.open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); } .desktop-persistent .close { display: flex; } .launcher { bottom: 16px; ${config.position}: 16px; } .panel { bottom: 84px; ${config.position}: 8px; max-height: calc(100vh - 100px); width: calc(100vw - 16px); } .panel-top { align-items: flex-start; } .view-switcher { grid-template-columns: 1fr; } }
    </style>
    <div class="widget">
      <button class="launcher" type="button" aria-expanded="false" aria-controls="specialized-agent-panel" aria-label="Open specialist chat">
        <span class="unread"></span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.5 6.75A2.75 2.75 0 0 1 8.25 4h7.5a2.75 2.75 0 0 1 2.75 2.75v5.5A2.75 2.75 0 0 1 15.75 15H12l-3.8 3v-3H8.25a2.75 2.75 0 0 1-2.75-2.75v-5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 9.75h6M9 12.25h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <section class="panel" id="specialized-agent-panel" role="dialog" aria-modal="false" aria-label="Specialist chat" aria-hidden="true">
        <div class="panel-top"><div class="view-switcher" role="radiogroup" aria-label="Choose what you are viewing"><button class="view-option" type="button" role="radio" data-agent="support" aria-checked="false">Viewing a support ticket database</button><button class="view-option" type="button" role="radio" data-agent="sales" aria-checked="true">Viewing the plan pricing page</button></div><button class="close" type="button" aria-label="Close specialist chat"><svg viewBox="0 0 24 24" fill="none" width="19" height="19" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
        <div class="messages" aria-live="polite"></div>
        <div class="status" role="status"></div>
        <form class="composer"><textarea rows="2" aria-label="Message the active specialist" placeholder="Ask a question…"></textarea><div class="composer-actions"><button class="send" type="submit">Send</button><button class="cancel hidden" type="button">Cancel</button></div></form>
      </section>
    </div>
  `;

  const elements = {
    widget: shadow.querySelector('.widget'),
    launcher: shadow.querySelector('.launcher'),
    unread: shadow.querySelector('.unread'),
    panel: shadow.querySelector('.panel'),
    close: shadow.querySelector('.close'),
    viewOptions: [...shadow.querySelectorAll('.view-option')],
    messages: shadow.querySelector('.messages'),
    status: shadow.querySelector('.status'),
    form: shadow.querySelector('form'),
    input: shadow.querySelector('textarea'),
    send: shadow.querySelector('.send'),
    cancel: shadow.querySelector('.cancel'),
  };

  const state = {
    open: false,
    agent: 'sales',
    messages: [],
    timeline: [],
    conversationId: `embed_${crypto.randomUUID()}`,
    pending: null,
    lastFocus: null,
  };
  const desktopQuery = window.matchMedia('(min-width: 768px)');

  function setStatus(message, error = false) {
    elements.status.textContent = message || '';
    elements.status.classList.toggle('error', error);
  }

  function specialistLabel(agent) {
    return `${labels[agent]} specialist`;
  }

  function addMessage(role, content, agent = state.agent) {
    const message = { kind: 'message', role, content, agent };
    state.messages.push({ role, content });
    state.timeline.push(message);
    return message;
  }

  function addTransferEvent(destination) {
    const event = { kind: 'transfer', destination, status: 'pending' };
    state.timeline.push(event);
    return event;
  }

  function appendInlineMarkdown(parent, source) {
    const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/gu;
    let cursor = 0;
    for (const match of source.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > cursor) parent.append(document.createTextNode(source.slice(cursor, index)));
      if (match[2] && match[3]) {
        const link = document.createElement('a');
        link.href = match[3];
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = match[2];
        parent.append(link);
      } else if (match[4]) {
        const code = document.createElement('code');
        code.textContent = match[4];
        parent.append(code);
      } else if (match[5] || match[6]) {
        const strong = document.createElement('strong');
        strong.textContent = match[5] || match[6];
        parent.append(strong);
      } else if (match[7] || match[8]) {
        const emphasis = document.createElement('em');
        emphasis.textContent = match[7] || match[8];
        parent.append(emphasis);
      }
      cursor = index + match[0].length;
    }
    if (cursor < source.length) parent.append(document.createTextNode(source.slice(cursor)));
  }

  function renderMarkdown(target, source) {
    target.replaceChildren();
    const lines = String(source || '').replace(/\r\n?/gu, '\n').split('\n');
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index += 1; continue; }
      if (/^```/u.test(line.trim())) {
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^```/u.test(lines[index].trim())) { codeLines.push(lines[index]); index += 1; }
        if (index < lines.length) index += 1;
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = codeLines.join('\n');
        pre.append(code);
        target.append(pre);
        continue;
      }
      const heading = line.match(/^#{1,3}\s+(.+)$/u);
      if (heading) {
        const element = document.createElement('h3');
        appendInlineMarkdown(element, heading[1]);
        target.append(element);
        index += 1;
        continue;
      }
      const listMatch = line.match(/^\s*([-*]|\d+\.)\s+(.+)$/u);
      if (listMatch) {
        const list = document.createElement(/\d/u.test(listMatch[1]) ? 'ol' : 'ul');
        while (index < lines.length) {
          const item = lines[index].match(/^\s*([-*]|\d+\.)\s+(.+)$/u);
          if (!item || (/\d/u.test(item[1]) !== /\d/u.test(listMatch[1]))) break;
          const li = document.createElement('li');
          appendInlineMarkdown(li, item[2]);
          list.append(li);
          index += 1;
        }
        target.append(list);
        continue;
      }
      const paragraphLines = [line];
      index += 1;
      while (index < lines.length && lines[index].trim() && !/^```/u.test(lines[index].trim()) && !/^#{1,3}\s+/u.test(lines[index]) && !/^\s*([-*]|\d+\.)\s+/u.test(lines[index])) {
        paragraphLines.push(lines[index]);
        index += 1;
      }
      const paragraph = document.createElement('p');
      appendInlineMarkdown(paragraph, paragraphLines.join('\n'));
      target.append(paragraph);
    }
  }

  function render() {
    elements.viewOptions.forEach((option) => option.setAttribute('aria-checked', String(option.dataset.agent === state.agent)));
    elements.messages.replaceChildren();
    const label = document.createElement('div');
    label.className = 'conversation-label';
    label.textContent = `Chatting with the ${specialistLabel(state.agent)}`;
    elements.messages.append(label);
    for (const item of state.timeline) {
      if (item.kind === 'transfer') {
        const transfer = document.createElement('div');
        transfer.className = `transfer-event ${item.status}`;
        transfer.textContent = item.status === 'pending'
          ? `Transferring to the ${specialistLabel(item.destination)}...`
          : item.status === 'complete'
            ? `Transferred to the ${specialistLabel(item.destination)}`
            : item.status === 'cancelled'
              ? `Transfer to the ${specialistLabel(item.destination)} cancelled`
              : `Transfer to the ${specialistLabel(item.destination)} failed`;
        elements.messages.append(transfer);
        continue;
      }
      const row = document.createElement('article');
      row.className = `message ${item.role}`;
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = item.role === 'user' ? 'Y' : item.agent === 'sales' ? 'S' : 'P';
      const wrap = document.createElement('div');
      wrap.className = 'bubble-wrap';
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = item.role === 'user' ? 'You' : `${labels[item.agent]} specialist`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      if (item.role === 'assistant') renderMarkdown(bubble, item.content);
      else bubble.textContent = item.content;
      wrap.append(meta, bubble);
      row.append(avatar, wrap);
      elements.messages.append(row);
    }
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }

  function setPending(pending) {
    state.pending = pending;
    const busy = Boolean(pending);
    elements.input.disabled = busy;
    elements.send.disabled = busy;
    elements.viewOptions.forEach((option) => { option.disabled = busy; });
    elements.cancel.classList.toggle('hidden', !busy);
    elements.cancel.disabled = !busy;
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

  async function transferTo(destination, controller, depth = 0) {
    const event = addTransferEvent(destination);
    render();
    try {
      const response = await request('/api/transfer', {
        sourceAgent: state.agent,
        destination,
        conversationId: state.conversationId,
        messages: state.messages.slice(-12).map(({ role, content }) => ({ role, content })),
      }, controller);
      event.status = 'complete';
      state.agent = destination;
      if (response.opening) addMessage('assistant', response.opening, destination);
      if (response.content) addMessage('assistant', response.content, destination);
      render();
      if (response.transfer && depth < 2) await transferTo(response.transfer.destination, controller, depth + 1);
    } catch (error) {
      event.status = error.name === 'AbortError' ? 'cancelled' : 'error';
      render();
      throw error;
    }
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
    setStatus(`Contacting the ${specialistLabel(state.agent)}…`);
    try {
      const response = await request('/api/chat', { agent: state.agent, conversationId: state.conversationId, messages: state.messages.slice(-12).map(({ role, content: messageContent }) => ({ role, content: messageContent })) }, controller);
      if (response.transfer) await transferTo(response.transfer.destination, controller);
      else if (response.content) addMessage('assistant', response.content, response.agent);
      setStatus('');
    } catch (error) {
      setStatus(error.name === 'AbortError' ? 'Request cancelled.' : error.message, true);
    } finally {
      setPending(null);
      render();
    }
  }

  function selectAgent(agent) {
    if (state.pending || !labels[agent] || state.agent === agent) return;
    state.agent = agent;
    state.messages = [];
    state.timeline = [];
    state.conversationId = `embed_${crypto.randomUUID()}`;
    setStatus('');
    render();
    elements.input.focus();
  }

  function setOpen(open, { focus = true } = {}) {
    state.open = open;
    elements.panel.classList.toggle('open', open);
    elements.panel.inert = !open;
    elements.panel.setAttribute('aria-hidden', String(!open));
    elements.launcher.setAttribute('aria-expanded', String(open));
    elements.unread.classList.toggle('hidden', open);
    if (open && focus) {
      state.lastFocus = document.activeElement;
      window.setTimeout(() => elements.input.focus(), 0);
    } else if (state.lastFocus && typeof state.lastFocus.focus === 'function') {
      state.lastFocus.focus();
    }
  }

  elements.launcher.addEventListener('click', () => setOpen(!state.open));
  elements.close.addEventListener('click', () => setOpen(false));
  elements.viewOptions.forEach((option) => option.addEventListener('click', () => selectAgent(option.dataset.agent)));
  elements.form.addEventListener('submit', sendMessage);
  elements.cancel.addEventListener('click', () => state.pending?.controller.abort());
  document.addEventListener('keydown', (event) => {
    const persistentDesktop = config.openMode === 'desktop' && desktopQuery.matches;
    if (event.key === 'Escape' && state.open && !persistentDesktop) setOpen(false);
  });

  function applyOpenMode({ initial = false } = {}) {
    const persistent = config.openMode === 'desktop' && desktopQuery.matches;
    elements.widget.classList.toggle('desktop-persistent', persistent);
    if (persistent !== state.open) setOpen(persistent, { focus: !initial });
    else {
      elements.panel.inert = !state.open;
      elements.panel.setAttribute('aria-hidden', String(!state.open));
    }
  }

  const handleDesktopChange = () => applyOpenMode();
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', handleDesktopChange);
  else desktopQuery.addListener(handleDesktopChange);
  applyOpenMode({ initial: true });
  render();
})();
