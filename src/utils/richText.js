const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "P", "DIV", "BR",
  "UL", "OL", "LI", "BLOCKQUOTE", "H2", "H3", "A",
]);

export const sanitizeRichText = (value = "") => {
  const rawHtml = String(value ?? "");
  const html =
    typeof DOMParser !== "undefined" &&
    /&lt;\s*\/?\s*[a-z][^&]*&gt;/i.test(rawHtml)
      ? new DOMParser().parseFromString(rawHtml, "text/html").body.textContent
      : rawHtml;

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  }

  const documentValue = new DOMParser().parseFromString(html, "text/html");
  const nodes = [...documentValue.body.querySelectorAll("*")];

  nodes.forEach((node) => {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }

    [...node.attributes].forEach((attribute) => {
      const keepHref =
        node.tagName === "A" &&
        attribute.name === "href" &&
        /^(https?:|mailto:)/i.test(attribute.value);

      if (!keepHref) node.removeAttribute(attribute.name);
    });

    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  return documentValue.body.innerHTML;
};

export const stripRichText = (value = "") =>
  String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isRichTextEmpty = (value = "") =>
  stripRichText(value).length === 0;
