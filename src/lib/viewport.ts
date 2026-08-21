function selectorFor(element: Element): string {
  const id = element.id !== "" ? `#${element.id}` : "";
  const className =
    typeof element.className === "string" ? element.className.trim() : "";
  const firstClass = className !== "" ? `.${className.split(/\s+/)[0] ?? ""}` : "";
  return `${element.tagName.toLowerCase()}${id}${firstClass}`;
}

export function hasHorizontalOverflow(): boolean {
  return document.documentElement.scrollWidth > window.innerWidth;
}

export function overflowingElements(): string[] {
  const overflowing: string[] = [];
  for (const element of document.querySelectorAll("*")) {
    if (element.getBoundingClientRect().right > window.innerWidth) {
      overflowing.push(selectorFor(element));
    }
  }
  return overflowing;
}
