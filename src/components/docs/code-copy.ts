// Guide code blocks gain a copy action only once JavaScript runs, so static
// HTML, DOM budgets and no-JavaScript readers are unaffected.
const label = 'Copy code';
const enhance = () => {
  for (const pre of document.querySelectorAll<HTMLPreElement>('.markdown-doc pre:not([data-copy-ready])')) {
    pre.dataset.copyReady = '';
    const wrapper = document.createElement('div');
    const button = document.createElement('button');
    const status = document.createElement('span');
    wrapper.className = 'code-block';
    button.type = 'button';
    button.className = 'code-copy';
    status.setAttribute('role', 'status');
    status.className = 'sr-only';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      button.textContent = 'Copy';
      button.setAttribute('aria-label', label);
      status.textContent = '';
      status.className = 'sr-only';
    };
    reset();
    button.addEventListener('click', async () => {
      clearTimeout(timer);
      reset();
      try {
        await navigator.clipboard.writeText((pre.textContent ?? '').replace(/\n$/, ''));
        button.textContent = 'Copied';
        button.setAttribute('aria-label', 'Copied to clipboard');
        status.textContent = 'Copied to clipboard';
        timer = setTimeout(reset, 1600);
      } catch {
        status.textContent = 'Could not copy; select the code manually.';
        status.className = 'code-copy-error';
      }
    });
    pre.replaceWith(wrapper);
    wrapper.append(pre, button, status);
  }
};
document.addEventListener('astro:page-load', enhance);
enhance();
