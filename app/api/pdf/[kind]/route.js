import { handle, pdfResponse, qp, HttpError } from "@/server/http";
import { getCurrentUser } from "@/server/auth";
import { computeStock, mutationsOf } from "@/server/reports";
import { stockByItem } from "@/server/mutations";
import { formatDateSlash } from "@/server/format";
import { paperMutationsPdf, inkMutationsPdf, otherMutationsPdf, stockSummaryPdf } from "@/server/pdf/builders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodLabel(start, end) {
  if (!start && !end) return "Semua periode";
  return `${start ? formatDateSlash(start) : "awal"} s.d. ${end ? formatDateSlash(end) : "sekarang"}`;
}

const MUTATION_KINDS = {
  "paper-mutations": { type: "paper", builder: paperMutationsPdf, file: "laporan-mutasi-kertas.pdf" },
  "ink-mutations": { type: "ink", builder: inkMutationsPdf, file: "laporan-mutasi-tinta.pdf" },
  "other-mutations": { type: "other", builder: otherMutationsPdf, file: "laporan-mutasi-lain.pdf" },
};

export const GET = handle(async (req, { params }) => {
  const { kind } = await params;
  const current = await getCurrentUser(req);
  const printedBy = current?.name || current?.username || "";
  const start = qp(req, "start");
  const end = qp(req, "end");

  if (MUTATION_KINDS[kind]) {
    const cfg = MUTATION_KINDS[kind];
    let rows = await mutationsOf(cfg.type, { start, end });
    const itemId = qp(req, "item_id");
    if (itemId) rows = rows.filter((m) => m.item_id === itemId);
    rows.sort((a, b) => `${a.date} ${a.time || ""} ${a.created_at || ""}`.localeCompare(`${b.date} ${b.time || ""} ${b.created_at || ""}`));
    const stock = await stockByItem(cfg.type);
    const stockById = Object.fromEntries(Object.entries(stock).map(([k, v]) => [k, v.stock]));
    return pdfResponse(await cfg.builder(rows, periodLabel(start, end), { printedBy, stockById }), cfg.file);
  }

  if (kind === "stock-ringkas") {
    const stock = await computeStock();
    const now = new Date().toISOString().slice(0, 10);
    return pdfResponse(await stockSummaryPdf(stock, formatDateSlash(now), { printedBy }), "laporan-stok-akhir.pdf");
  }

  throw new HttpError(404, "Jenis laporan PDF tidak dikenal");
});
