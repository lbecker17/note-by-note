// A small, safe XML reader, enough for MusicXML sheet music. It builds a plain tree of
// { name, attrs, children, text }. It never processes a DTD: a <!DOCTYPE> is skipped whole,
// so entities declared there are never expanded (no "billion laughs", no external files).
// Only the five XML entities and numeric character references are decoded; any other
// &name; stays as written. Namespace prefixes are dropped from element names.

import { decodeUtf8, decodeCp1252, decodeUtf16, stripUtf8Bom, toBytes } from './text.js';

// elements: each one costs a few hundred bytes of memory; a song's sheet music has tens of
// thousands at most.
export const XML_LIMITS = { chars: 48 * 1024 * 1024, depth: 256, elements: 600_000, attrs: 256 };

export class XmlError extends Error {}

const NAMED = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function validCodePoint(c) {
  return c === 0x9 || c === 0xa || c === 0xd || (c >= 0x20 && c <= 0xd7ff) || (c >= 0xe000 && c <= 0xfffd) || (c >= 0x10000 && c <= 0x10ffff);
}

export function decodeEntities(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,10}|[A-Za-z][A-Za-z0-9._-]{0,31});/g, (all, ref) => {
    if (ref[0] === '#') {
      const c = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return validCodePoint(c) ? String.fromCodePoint(c) : '\ufffd';
    }
    return Object.prototype.hasOwnProperty.call(NAMED, ref) ? NAMED[ref] : all;
  });
}

const localName = (q) => {
  const i = q.indexOf(':');
  return i >= 0 ? q.slice(i + 1) : q;
};

// Skip <!DOCTYPE ...> or another <!...> declaration, including an internal subset in [...].
function skipDeclaration(src, i) {
  let depth = 0;
  let quote = '';
  for (let j = i + 2; j < src.length; j++) {
    const c = src[j];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '<' && src.startsWith('<!--', j)) {
      const e = src.indexOf('-->', j + 4);
      if (e < 0) break;
      j = e + 2;
    } else if (c === '[') depth++;
    else if (c === ']') depth = Math.max(0, depth - 1);
    else if (c === '>' && depth === 0) return j + 1;
  }
  throw new XmlError('The XML has an unfinished <!DOCTYPE>.');
}

const ATTR = /\s*([^\s=/>"']+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/y;
const TAG = /<([^\s/>!?]+)/y;

export function parseXML(src) {
  if (typeof src !== 'string') throw new TypeError('parseXML needs a string');
  if (src.length > XML_LIMITS.chars) throw new XmlError('This file is too big.');
  const doc = { name: '#document', attrs: {}, children: [], text: '' };
  const stack = [doc];
  let count = 0;
  let i = src.charCodeAt(0) === 0xfeff ? 1 : 0;
  const n = src.length;

  const addText = (t) => {
    const top = stack[stack.length - 1];
    if (top === doc) return;
    // Indentation between child elements isn't content.
    if (top.children.length && !/\S/.test(t)) return;
    top.text += t;
  };

  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt < 0) {
      addText(decodeEntities(src.slice(i)));
      break;
    }
    if (lt > i) addText(decodeEntities(src.slice(i, lt)));
    i = lt;
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      if (e < 0) throw new XmlError('The XML has an unfinished comment.');
      i = e + 3;
    } else if (src.startsWith('<![CDATA[', i)) {
      const e = src.indexOf(']]>', i + 9);
      if (e < 0) throw new XmlError('The XML has an unfinished CDATA section.');
      addText(src.slice(i + 9, e));
      i = e + 3;
    } else if (src.startsWith('<?', i)) {
      const e = src.indexOf('?>', i + 2);
      if (e < 0) throw new XmlError('The XML has an unfinished <? ?> instruction.');
      i = e + 2;
    } else if (src.startsWith('<!', i)) {
      i = skipDeclaration(src, i);
    } else if (src[i + 1] === '/') {
      const e = src.indexOf('>', i + 2);
      if (e < 0) throw new XmlError('The XML ends inside a closing tag.');
      const name = localName(src.slice(i + 2, e).trim());
      // Close the matching element; a stray closing tag is ignored.
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      }
      i = e + 1;
    } else {
      TAG.lastIndex = i;
      const m = TAG.exec(src);
      if (!m) {
        addText('<');
        i++;
        continue;
      }
      const el = { name: localName(m[1]), attrs: {}, children: [], text: '' };
      let j = i + m[0].length;
      let nattrs = 0;
      for (;;) {
        ATTR.lastIndex = j;
        const a = ATTR.exec(src);
        if (!a || a.index !== j) break;
        j = ATTR.lastIndex;
        if (++nattrs > XML_LIMITS.attrs) throw new XmlError('An XML element has too many attributes.');
        let v = a[2] == null ? '' : a[2];
        if (v[0] === '"' || v[0] === "'") v = v.slice(1, -1);
        const key = a[1];
        if (key !== '__proto__') el.attrs[key] = decodeEntities(v.replace(/[\t\n\r]/g, ' '));
      }
      while (j < n && /\s/.test(src[j])) j++;
      let selfClose = false;
      if (src[j] === '/') {
        selfClose = true;
        j++;
      }
      if (src[j] !== '>') throw new XmlError(`The XML has a broken <${el.name}> tag.`);
      i = j + 1;
      if (++count > XML_LIMITS.elements) throw new XmlError('This file has too many XML elements.');
      stack[stack.length - 1].children.push(el);
      if (!selfClose) {
        if (stack.length > XML_LIMITS.depth) throw new XmlError('The XML is nested too deeply.');
        stack.push(el);
      }
    }
  }
  return doc;
}

// Tree helpers (by local name).
export const kids = (el, name) => (el ? el.children.filter((c) => c.name === name) : []);
export const kid = (el, name) => (el ? el.children.find((c) => c.name === name) || null : null);
export const txt = (el, name) => {
  const c = name == null ? el : kid(el, name);
  return c ? c.text.trim() : '';
};
export const num = (el, name, dflt = null) => {
  const t = txt(el, name);
  const v = t === '' ? NaN : Number(t);
  return Number.isFinite(v) ? v : dflt;
};

// Bytes of an XML file -> string, following its BOM or its encoding declaration.
// UTF-8 is tried strictly; anything that isn't valid UTF-8 falls back to Windows-1252.
export function decodeXmlBytes(data) {
  const b = toBytes(data);
  if (b[0] === 0xff && b[1] === 0xfe) return decodeUtf16(b.subarray(2), true);
  if (b[0] === 0xfe && b[1] === 0xff) return decodeUtf16(b.subarray(2), false);
  if (b[0] === 0x3c && b[1] === 0 && b[2] === 0x3f && b[3] === 0) return decodeUtf16(b, true);
  if (b[0] === 0 && b[1] === 0x3c && b[2] === 0 && b[3] === 0x3f) return decodeUtf16(b, false);
  const body = stripUtf8Bom(b);
  const head = decodeCp1252(body.subarray(0, 200));
  const decl = /^\s*<\?xml[^>]*encoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(head);
  const enc = decl ? decl[1].toLowerCase() : 'utf-8';
  if (/^(iso-8859-1|latin-?1|windows-1252|cp1252|us-ascii|ascii)$/.test(enc)) return decodeCp1252(body);
  const u = decodeUtf8(body);
  return u != null ? u : decodeCp1252(body);
}
