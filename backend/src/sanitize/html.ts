const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " "
};

const SCRIPT_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAG_RE = /<[^>]*>/g;
const ANGLE_FRAGMENT_RE = /[<>]/g;
const ENTITY_RE = /&(amp|lt|gt|quot|#39|nbsp);/gi;

function decodeEntities(input: string): string {
  return input.replace(ENTITY_RE, (match) => ENTITY_MAP[match.toLowerCase()] ?? match);
}

export function stripHtml(input: string): string {
  try {
    const withoutScriptAndStyle = input.replace(SCRIPT_STYLE_RE, " ");
    const withoutTags = withoutScriptAndStyle.replace(TAG_RE, " ");
    const decoded = decodeEntities(withoutTags);
    return decoded.replace(ANGLE_FRAGMENT_RE, "");
  } catch {
    return "";
  }
}
