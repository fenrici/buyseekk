/** Scroll the main panel viewport back to the top (header + tabs). */
export function scrollPanelToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });
}
