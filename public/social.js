const canonical = document.querySelector('link[rel="canonical"]')?.href || 'https://www.ofnectar.com/';

for (const button of document.querySelectorAll('[data-share-cup]')) {
  button.addEventListener('click', async () => {
    const status = document.querySelector('[data-share-status]');
    const payload = { title: document.title, text: 'a cup of Nectar.', url: canonical };
    try {
      if (navigator.share) {
        await navigator.share(payload);
        if (status) status.textContent = '';
      } else {
        await navigator.clipboard.writeText(canonical);
        if (status) status.textContent = 'Link copied. Share it with your people.';
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (status) status.textContent = `Share this page: ${canonical}`;
    }
  });
}
