import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle2, Check } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/poApi";
import { useLang } from "@/context/LangContext";
import { STAGE_ORDER, sortStages } from "@/lib/poStages";
import MachineField from "@/components/po/MachineField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const STAGES = STAGE_ORDER;

export default function PoForm() {
  const { id } = useParams();
  const editing = !!id;
  const { t, stageName } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    po_number: "", client_name: "", item_type: "", material: "", paper_size_plano: "", paper_size: "",
    size_single_face: "", size_kres_cetak: "", size_kres_pisau: "",
    quantity: "", po_date: "", est_start: "", est_end: "", deadline: "", print_machine: "",
    enabled_stages: [] /* PO baru: tidak ada tahap terpilih otomatis */, notes: "",
  });
  const [conflicts, setConflicts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      api.getPo(id).then((p) => {
        setForm({
          po_number: p.po_number, client_name: p.client_name, item_type: p.item_type || "",
          material: p.material || "", paper_size_plano: p.paper_size_plano || "", paper_size: p.paper_size || "", quantity: p.quantity || "",
          size_single_face: p.size_single_face || "", size_kres_cetak: p.size_kres_cetak || "",
          size_kres_pisau: p.size_kres_pisau || "",
          po_date: p.po_date || "", est_start: p.est_start || "", est_end: p.est_end || "", deadline: p.deadline || "",
          print_machine: p.print_machine || "",
          enabled_stages: sortStages(p.enabled_stages || []), notes: p.notes || "",
        });
      }).catch((e) => toast.error(e?.response?.data?.detail || "Gagal load"));
    }
  }, [id, editing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const checkConflict = useCallback(async (start, end) => {
    if (!start || !end) { setConflicts([]); return; }
    try {
      const data = await api.checkConflict({ est_start: start, est_end: end, exclude_id: id });
      setConflicts(data.conflicts || []);
    } catch {}
  }, [id]);

  useEffect(() => { checkConflict(form.est_start, form.est_end); }, [form.est_start, form.est_end, checkConflict]);

  const toggleStage = (n) => {
    setForm((f) => {
      const has = f.enabled_stages.includes(n);
      return { ...f, enabled_stages: has ? f.enabled_stages.filter((x) => x !== n) : sortStages([...f.enabled_stages, n]) };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.po_number.trim() || !form.client_name.trim()) { toast.error("Nomor PO & Nama Klien wajib diisi"); return; }
    setSaving(true);
    const payload = { ...form, print_machine: form.print_machine ? form.print_machine.trim() || null : null };
    try {
      if (editing) {
        await api.updatePo(id, payload);
        toast.success("PO diperbarui");
        navigate(`/po/pos/${id}`);
      } else {
        const data = await api.createPo(payload);
        toast.success("PO dibuat");
        navigate(`/po/pos/${data.id}`);
      }
    } catch (err) { toast.error(err?.response?.data?.detail || "Gagal simpan"); }
    finally { setSaving(false); }
  };

  const field = (key, label, type = "text", placeholder) => (
    <div className="space-y-2 min-w-0">
      <Label>{label}</Label>
      <Input data-testid={`po-field-${key}`} type={type} value={form[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} className="h-11 rounded-xl w-full min-w-0" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="po-form-page">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">{editing ? t("edit") : t("newPO")}</h1>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card className="rounded-2xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {field("po_number", t("poNumber") + " *")}
            {field("client_name", t("clientName") + " *")}
            {field("po_date", t("poDate"), "date")}
            {field("material", t("material"))}
            {field("item_type", t("itemType"))}
            {field("paper_size_plano", t("paperSizePlano"), "text", "cth: 65 x 100")}
            {field("paper_size", t("paperSize"), "text", "cth: 83 x 56,5")}
            {field("size_kres_cetak", t("sizeKresCetak"), "text", "cth: 81,5 x 54,5")}
            {field("size_single_face", t("sizeSingleFace"), "text", "cth: 82,3 x 55,8")}
            {field("size_kres_pisau", t("sizeKresPisau"), "text", "cth: 80 x 52")}
            {field("quantity", t("quantity"))}
            <div className="space-y-2 min-w-0">
              <Label>{t("printMachine")}</Label>
              <MachineField value={form.print_machine} onChange={(v) => set("print_machine", v)} />
            </div>
            {field("est_start", t("estStart"), "date")}
            {field("est_end", t("estEnd"), "date")}
            {field("deadline", t("deadline"), "date")}
          </div>

          {conflicts.length > 0 && (
            <div data-testid="po-conflict-warning" className="rounded-xl border border-amber-500 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" /> {t("conflictTitle")}
              </div>
              <p className="text-sm mt-1 text-muted-foreground">{t("conflictDesc")}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {conflicts.map((c) => (
                  <li key={c.id} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold">{c.po_number}</span>
                    <span>· {c.client_name}</span>
                    <span className="text-muted-foreground">· {c.est_start} → {c.est_end}</span>
                    {c.print_machine && <span className="text-muted-foreground">· {t("machine")}: {c.print_machine}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {form.est_start && form.est_end && conflicts.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {t("noConflict")}</div>
          )}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea data-testid="po-field-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} className="rounded-xl min-h-[80px]" />
          </div>
        </Card>

        <Card className="rounded-2xl p-6">
          <Label className="text-base font-semibold">{t("stagesUsed")}</Label>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Centang tahapan yang dipakai PO ini</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {STAGES.map((n) => {
              const checked = form.enabled_stages.includes(n);
              return (
                <div key={n} data-testid={`po-stage-check-${n}`} onClick={() => toggleStage(n)}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${checked ? "border-primary bg-accent" : "border-border hover:bg-accent/40"}`}>
                  <span className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-sm"><span className="text-muted-foreground">{STAGE_ORDER.indexOf(n) + 1}.</span> {stageName(n)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="rounded-full flex-1" onClick={() => navigate(-1)}>{t("cancel")}</Button>
          <Button type="submit" data-testid="po-save" disabled={saving} className="rounded-full flex-1">{saving ? t("saving") : t("save")}</Button>
        </div>
      </form>
    </div>
  );
}
