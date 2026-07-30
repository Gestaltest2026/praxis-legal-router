declare module "pdf-parse" {
  type PdfResult = {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  };

  export default function pdfParse(data: Buffer): Promise<PdfResult>;
}
