import type { ApprovedTemplateDefinition } from "./templateRegistry";
import type { DocxTemplateBinary } from "./docxRenderingAdapter";

export type RetainerTemplateRegistry = {
  definitions: readonly ApprovedTemplateDefinition[];
  binaries: ReadonlyMap<string, DocxTemplateBinary>;
};

export function templateRegistryKey(templateId: string, version: string): string {
  return `${templateId}@${version}`;
}

export function getRetainerTemplateBinary(
  registry: RetainerTemplateRegistry,
  templateId: string,
  version: string
): DocxTemplateBinary | undefined {
  return registry.binaries.get(templateRegistryKey(templateId, version));
}

// Production deployments must replace this empty registry with an attorney-approved,
// server-controlled template registration process. Keeping it empty is fail-closed:
// no DOCX binary can be assembled or returned until a verified template is registered.
export const RETAINER_TEMPLATE_REGISTRY: RetainerTemplateRegistry = {
  definitions: [],
  binaries: new Map(),
};
