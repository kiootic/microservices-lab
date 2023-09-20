export function withScrollAnchor(
  scrollContainer: HTMLElement | null,
  anchorElement: HTMLElement | null,
  fn: () => void,
) {
  if (scrollContainer == null || anchorElement == null) {
    fn();
    return;
  }

  const y = anchorElement.getBoundingClientRect().y;
  fn();
  const dy = anchorElement.getBoundingClientRect().y - y;
  scrollContainer.scrollTop += dy;
}
