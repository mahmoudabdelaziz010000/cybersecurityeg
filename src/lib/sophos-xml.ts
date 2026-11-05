/**
 * Minimal, dependency-free XML reader for Sophos Firewall API responses.
 *
 * - Refuses DOCTYPE / entity declarations (no entity expansion, so no XXE or "billion laughs").
 * - Bounded input size and nesting depth.
 * - Repeated sibling elements become arrays; everything else is a string or a plain object.
 * - Attributes are kept as "@name" keys, except the noisy `transactionid` / `APIVersion` ones.
 */
export type XmlValue = string | XmlObject | XmlValue[];
export interface XmlObject {
  [key: string]: XmlValue;
}

export class XmlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlParseError";
  }
}

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DEPTH = 64;
const IGNORED_ATTRS = new Set(["transactionid", "apiversion"]);

interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|lt|gt|amp|quot|apos);/g, (_match, entity: string) => {
    switch (entity) {
      case "lt": return "<";
      case "gt": return ">";
      case "amp": return "&";
      case "quot": return '"';
      case "apos": return "'";
      default: {
        const codePoint = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        const valid = Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff);
        return valid ? String.fromCodePoint(codePoint) : "";
      }
    }
  });
}

function findTagEnd(xml: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < xml.length; i++) {
    const ch = xml[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  throw new XmlParseError("Unterminated tag");
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) attrs[match[1]!] = decodeEntities(match[2] ?? match[3] ?? "");
  return attrs;
}

function parseTree(xml: string): XmlNode {
  if (xml.length > MAX_BYTES) throw new XmlParseError("XML response too large");
  const root: XmlNode = { name: "#root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    const top = stack[stack.length - 1]!;
    if (lt === -1) {
      top.text += decodeEntities(xml.slice(i));
      break;
    }
    if (lt > i) top.text += decodeEntities(xml.slice(i, lt));
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt + 4);
      if (end === -1) throw new XmlParseError("Unterminated comment");
      i = end + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt + 9);
      if (end === -1) throw new XmlParseError("Unterminated CDATA");
      top.text += xml.slice(lt + 9, end);
      i = end + 3;
    } else if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt + 2);
      if (end === -1) throw new XmlParseError("Unterminated declaration");
      i = end + 2;
    } else if (xml.startsWith("<!", lt)) {
      throw new XmlParseError("DOCTYPE and entity declarations are not allowed");
    } else if (xml[lt + 1] === "/") {
      const end = xml.indexOf(">", lt);
      if (end === -1) throw new XmlParseError("Unterminated closing tag");
      const name = xml.slice(lt + 2, end).trim();
      const open = stack.pop();
      if (!open || open === root || open.name !== name) throw new XmlParseError(`Mismatched closing tag </${name}>`);
      i = end + 1;
    } else {
      const end = findTagEnd(xml, lt + 1);
      let inner = xml.slice(lt + 1, end);
      const selfClosing = inner.endsWith("/");
      if (selfClosing) inner = inner.slice(0, -1);
      const nameMatch = /^[A-Za-z_:][\w:.-]*/.exec(inner);
      if (!nameMatch) throw new XmlParseError("Invalid tag name");
      const node: XmlNode = { name: nameMatch[0], attrs: parseAttributes(inner.slice(nameMatch[0].length)), children: [], text: "" };
      top.children.push(node);
      if (!selfClosing) {
        if (stack.length > MAX_DEPTH) throw new XmlParseError("XML nesting too deep");
        stack.push(node);
      }
      i = end + 1;
    }
  }
  if (stack.length !== 1) throw new XmlParseError("Unclosed element");
  return root;
}

function nodeToValue(node: XmlNode): XmlValue {
  const attrs = Object.entries(node.attrs).filter(([name]) => !IGNORED_ATTRS.has(name.toLowerCase()));
  if (!node.children.length && !attrs.length) return node.text.trim();
  const out: XmlObject = {};
  for (const [name, value] of attrs) out[`@${name}`] = value;
  if (!node.children.length) {
    out["#text"] = node.text.trim();
    return out;
  }
  for (const child of node.children) {
    const value = nodeToValue(child);
    const existing = out[child.name];
    if (existing === undefined) out[child.name] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[child.name] = [existing, value];
  }
  return out;
}

/** Parse an XML document into `{ RootName: value }`. */
export function parseXml(xml: string): XmlObject {
  const root = parseTree(xml);
  const out: XmlObject = {};
  for (const child of root.children) out[child.name] = nodeToValue(child);
  return out;
}

/* ---------- value helpers ---------- */

export function isObject(value: XmlValue | undefined): value is XmlObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalise "missing / one / many" into an array. */
export function asList(value: XmlValue | undefined): XmlValue[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Text of a leaf value ("" when missing or not a leaf). */
export function str(value: XmlValue | undefined): string {
  if (typeof value === "string") return value;
  if (isObject(value)) {
    const text = value["#text"];
    return typeof text === "string" ? text : "";
  }
  return "";
}

/** Case-insensitive child lookup; the first matching name wins. */
export function pick(value: XmlValue | undefined, ...names: string[]): XmlValue | undefined {
  if (!isObject(value)) return undefined;
  const wanted = names.map((name) => name.toLowerCase());
  for (const key of Object.keys(value)) {
    if (wanted.includes(key.toLowerCase())) return value[key];
  }
  return undefined;
}

/** Follow a path of child names, e.g. `path(rule, "SpamProtection", "SpamProtectionStatus")`. */
export function path(value: XmlValue | undefined, ...names: string[]): XmlValue | undefined {
  let current = value;
  for (const name of names) current = pick(current, name);
  return current;
}

/** `<Zones><Zone>A</Zone><Zone>B</Zone></Zones>` -> ["A", "B"]. Also accepts a bare string. */
export function listOf(container: XmlValue | undefined, child: string): string[] {
  if (container === undefined) return [];
  if (typeof container === "string") return container ? [container] : [];
  return asList(pick(container, child)).map(str).filter(Boolean);
}

/** Tri-state on/off reader for Sophos flag values (Enable, ON, 1, $...{..._DISABLE}, ...). */
export function isOn(value: XmlValue | undefined): boolean | undefined {
  const raw = str(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (/(^|[^a-z])(off|disabled?|no|false|0|none)([^a-z]|$)|_disable|_off(?![a-z])/.test(raw)) return false;
  if (/(^|[^a-z])(on|enabled?|yes|true|1)([^a-z]|$)|_enable|_on(?![a-z])/.test(raw)) return true;
  return undefined;
}

/* ---------- redaction & flattening ---------- */

const SECRET_KEY = /(pass(word|wd|phrase)?|secret|psk|pre-?shared|token|community|private-?key|api-?key|credential|auth-?key|master-?key)/i;
export const REDACTED = "••••••";

export function isSecretKey(name: string): boolean {
  return SECRET_KEY.test(name);
}

/** Flatten a value into `[dotted.key, text]` pairs; secret-looking keys are always redacted. */
export function flatten(value: XmlValue | undefined, prefix = "", depth = 0, out: [string, string][] = []): [string, string][] {
  if (value === undefined) return out;
  if (typeof value === "string") {
    if (prefix) out.push([prefix, value]);
    return out;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      if (prefix) out.push([prefix, (value as string[]).join(", ")]);
      return out;
    }
    value.forEach((item, index) => flatten(item, `${prefix}[${index + 1}]`, depth + 1, out));
    return out;
  }
  if (depth > 6) return out;
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith("@")) continue;
    if (key === "#text") {
      if (prefix && child) out.push([prefix, String(child)]);
      continue;
    }
    const name = prefix ? `${prefix}.${key}` : key;
    if (isSecretKey(key)) out.push([name, REDACTED]);
    else flatten(child, name, depth + 1, out);
  }
  return out;
}
