import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MACHINES } from "@/lib/poStages";

/**
 * Pilihan Mesin Cetak: daftar bawaan atau "Custom" (ketik sendiri).
 * value  = nama mesin akhir (string, "" / null = kosong)
 * onChange(nama) dipanggil dengan string akhir ("" bila dikosongkan).
 * Input custom disimpan saat fokus keluar (onBlur) agar tidak menyimpan tiap ketikan.
 */
export default function MachineField({ value, onChange, testid = "po-field-print_machine", saveOnBlur = false }) {
  const isCustomValue = !!value && !MACHINES.includes(value);
  const [custom, setCustom] = useState(isCustomValue);
  const [text, setText] = useState(isCustomValue ? value : "");

  useEffect(() => {
    const c = !!value && !MACHINES.includes(value);
    if (c) { setCustom(true); setText(value); }
    else if (!custom) setText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selectValue = custom ? "__custom" : (value || "none");

  const onSelect = (v) => {
    if (v === "__custom") { setCustom(true); return; }
    setCustom(false);
    setText("");
    onChange(v === "none" ? "" : v);
  };

  return (
    <div className="space-y-2">
      <Select value={selectValue} onValueChange={onSelect}>
        <SelectTrigger data-testid={testid} className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-</SelectItem>
          {MACHINES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          <SelectItem value="__custom">Custom…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          data-testid={`${testid}-custom`}
          value={text}
          placeholder="Ketik nama mesin cetak"
          className="h-11 w-full rounded-xl"
          onChange={(e) => { setText(e.target.value); if (!saveOnBlur) onChange(e.target.value); }}
          onBlur={() => { if (saveOnBlur && text !== (value || "")) onChange(text); }}
        />
      )}
    </div>
  );
}
