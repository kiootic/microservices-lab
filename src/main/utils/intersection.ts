export function isIntersecting(a: HTMLElement, b: HTMLElement) {
  const aRect = a.getBoundingClientRect();
  const bRect = b.getBoundingClientRect();
  return !(
    bRect.left > aRect.right ||
    bRect.right < aRect.left ||
    bRect.top > aRect.bottom ||
    bRect.bottom < aRect.top
  );
}
