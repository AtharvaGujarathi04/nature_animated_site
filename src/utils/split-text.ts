/**
 * Splits an element's text into word + char spans. Words stay unbroken so lines
 * wrap naturally; chars are what gets animated. Keeps an aria-label for readers.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? '';
  el.setAttribute('aria-label', text.trim());
  el.textContent = '';
  const chars: HTMLElement[] = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      el.append(' ');
      return;
    }
    const word = document.createElement('span');
    word.className = 'split-word';
    word.setAttribute('aria-hidden', 'true');
    for (const c of part) {
      const span = document.createElement('span');
      span.className = 'split-char';
      span.textContent = c;
      word.append(span);
      chars.push(span);
    }
    el.append(word);
  });
  return chars;
}
