(() => {
  document.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', () => {
    try { localStorage.setItem('civic-ledger-language', link.dataset.language); } catch {}
    document.cookie = `ledger-language=${link.dataset.language}; Path=/; SameSite=Lax; Max-Age=31536000`;
  }));
  document.querySelector('[data-page-translate]')?.addEventListener('submit', event => {
    const form=event.currentTarget, language=form.querySelector('select').value;
    try { localStorage.setItem('civic-ledger-language',language); } catch {}
    const button=form.querySelector('button');
    button.textContent=button.dataset.i18nLoading;
    form.querySelector('[data-translation-progress]').textContent=button.dataset.i18nLoading;
    form.setAttribute('aria-busy','true');
  });
  document.querySelectorAll('[data-load-post]').forEach(button => button.addEventListener('click', () => {
    const container = button.closest('[data-social-post]');
    const status = container.querySelector('.voice-embed-status');
    const frameSlot = container.querySelector('.voice-embed-frame');
    let url;
    try {
      url = new URL(button.dataset.embedUrl);
      const facebook = url.hostname === 'www.facebook.com' && ['/plugins/post.php', '/plugins/page.php'].includes(url.pathname);
      const instagram = url.hostname === 'www.instagram.com' && /^\/(?:p|reel)\/[A-Za-z0-9_-]+\/embed\/?$/.test(url.pathname);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || (!facebook && !instagram)) throw new Error('Unsupported embed');
    } catch {
      status.textContent = button.dataset.i18nError;
      return;
    }
    button.disabled = true;
    status.textContent = button.dataset.i18nLoading;
    const frame = document.createElement('iframe');
    frame.title = button.dataset.i18nTitle;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.addEventListener('load', () => { status.textContent = button.dataset.i18nLoaded; });
    frame.addEventListener('error', () => {
      status.textContent = button.dataset.i18nError;
      button.disabled = false;
      button.textContent = button.dataset.i18nRetry;
    });
    frame.src = url.href;
    frameSlot.replaceChildren(frame);
    // Cross-origin login/privacy screens do not reliably emit an error event.
    // Keep the original link visible and explain the fallback even in that case.
    setTimeout(() => {
      if (status.textContent === button.dataset.i18nLoading) status.textContent = button.dataset.i18nLoaded;
    }, 12000);
  }));
  const menu = document.querySelector('.menu-button');
  if (menu) menu.addEventListener('click', () => {
    const expanded = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(expanded));
    document.querySelector('#primary-nav').classList.toggle('is-open', expanded);
    menu.querySelector('span').textContent = expanded ? '−' : '+';
  });
  document.querySelector('[data-copy-link]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    try { await navigator.clipboard.writeText(location.href);button.textContent = button.dataset.i18nSuccess; }
    catch {button.textContent = button.dataset.i18nError;}
  });
  document.querySelectorAll('[data-correction-form]').forEach(form => {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const status = form.querySelector('.form-status');
      const button = form.querySelector('button');
      if (data.message.trim().length < 20) {status.textContent = form.dataset.i18nShort;status.className = 'form-status error';return;}
      button.disabled = true;button.textContent = form.dataset.i18nLoading;status.textContent = '';
      try {
        const response = await fetch('/api/corrections', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        const result = await response.json();
        if (!response.ok) throw new Error(form.dataset.i18nError);
        status.textContent = `${form.dataset.i18nSuccess} ${result.id || ''}`;
        status.className = 'form-status success';form.reset();
      } catch(error) {status.textContent = form.dataset.i18nError;status.className = 'form-status error';}
      finally {button.disabled = false;button.textContent = form.dataset.i18nSubmit;}
    });
  });
})();
