import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Undo2, Redo2,
} from "lucide-react";
import { sanitizeRichText } from "../../utils/richText";

const controls = [
  ["bold", Bold, "Bold"],
  ["italic", Italic, "Italic"],
  ["underline", Underline, "Underline"],
  ["strikeThrough", Strikethrough, "Strikethrough"],
  ["insertUnorderedList", List, "Bulleted list"],
  ["insertOrderedList", ListOrdered, "Numbered list"],
  ["formatBlock", Quote, "Quote", "blockquote"],
  ["undo", Undo2, "Undo"],
  ["redo", Redo2, "Redo"],
];

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  minHeight = "min-h-28",
  disabled = false,
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  const emitChange = () => {
    onChange?.(sanitizeRichText(editorRef.current?.innerHTML || ""));
  };

  const runCommand = (command, commandValue = null) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-muted focus-within:ring-2 focus-within:ring-accent/40">
      <div className="flex flex-wrap gap-1 border-b border-border bg-bg-surface/70 p-2">
        {controls.map(([command, Icon, label, commandValue]) => (
          <button
            key={command}
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(command, commandValue)}
            className="grid h-9 w-9 place-items-center rounded-lg text-text-secondary transition hover:bg-accent-soft hover:text-accent disabled:opacity-40"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`${minHeight} rich-text-editor px-3 py-2.5 text-sm text-text-primary outline-none [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6`}
      />
      <style>{`
        .rich-text-editor:empty::before {
          color: rgb(148 163 184);
          content: attr(data-placeholder);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

