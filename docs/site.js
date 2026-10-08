document.querySelectorAll('[data-concept]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-concept]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('demo').src = `demo/${button.dataset.concept}.html`;
  });
});
