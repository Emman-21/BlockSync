import { sanitizeRichText, stripRichText } from "../../utils/richText";

export default function RichTextContent({ html = "", className = "" }) {
  if (!stripRichText(html)) return null;

  return (
    <div
      className={`rich-text-content whitespace-pre-wrap break-words ${className} [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_div]:min-h-[1em] [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:min-h-[1em] [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-6`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  );
}

