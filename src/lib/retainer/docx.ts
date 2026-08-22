import { Buffer } from "node:buffer";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { MappingResult } from "./schema";

type ZipEntry = {
  name: string;
  data: Buffer;
};

const EOCD = 0x06054b50;
const CEN = 0x02014b50;
const LOC = 0x04034b50;

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const start = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD) return offset;
  }
  throw new Error("DOCX ZIP end-of-central-directory record not found.");
}

function readZip(buffer: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  let cursor = centralOffset;

  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(cursor) !== CEN) throw new Error("Invalid DOCX ZIP central directory.");
    const compression = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");

    if (buffer.readUInt32LE(localOffset) !== LOC) throw new Error(`Invalid local file header for ${name}.`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = compression === 0 ? Buffer.from(compressed) : compression === 8 ? inflateRawSync(compressed) : null;
    if (!data) throw new Error(`Unsupported DOCX ZIP compression method ${compression} for ${name}.`);
    entries.push({ name, data });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function writeZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(LOC, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(CEN, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);

    offset += local.length + compressed.length;
  }

  const centralOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function xmlDecode(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function extractTextFromDocxBase64(base64: string): string {
  const entries = readZip(Buffer.from(base64, "base64"));
  const xmlParts = entries
    .filter((entry) => entry.name === "word/document.xml" || /^word\/(header|footer)\d+\.xml$/.test(entry.name))
    .map((entry) => entry.data.toString("utf8"));

  return xmlParts
    .join("\n")
    .replace(/<w:tab\/?>(?![^<]*>)/g, "\t")
    .replace(/<w:br\/?>(?![^<]*>)/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\r?\n/)
    .map((line) => xmlDecode(line).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export function buildDocxFromTemplateBase64(args: {
  templateBase64: string;
  mappings: MappingResult[];
}): { base64: string; unresolvedXmlPlaceholders: string[] } {
  const entries = readZip(Buffer.from(args.templateBase64, "base64"));
  const unresolvedXmlPlaceholders: string[] = [];
  const filled = args.mappings.filter((mapping) => mapping.status === "filled" && mapping.value);

  const updated = entries.map((entry) => {
    if (!entry.name.startsWith("word/") || !entry.name.endsWith(".xml")) return entry;
    let xml = entry.data.toString("utf8");
    for (const mapping of filled) {
      const replacement = xmlEscape(mapping.value || "");
      xml = xml.split(mapping.slot.raw).join(replacement);
      xml = xml.split(xmlEscape(mapping.slot.raw)).join(replacement);
    }
    const unresolved = xml.match(/\{\{[^}]+\}\}|&lt;&lt;[^&]+&gt;&gt;|\[[A-Z][A-Z0-9 _\-/]{2,}\]|\bTBD\b/gi) || [];
    unresolvedXmlPlaceholders.push(...unresolved);
    return { ...entry, data: Buffer.from(xml, "utf8") };
  });

  return {
    base64: writeZip(updated).toString("base64"),
    unresolvedXmlPlaceholders: [...new Set(unresolvedXmlPlaceholders)],
  };
}
