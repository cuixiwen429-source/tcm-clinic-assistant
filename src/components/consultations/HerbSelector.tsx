"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface HerbItem {
  name: string;
  dose: number;
  note: string;
}

interface HerbSelectorProps {
  herbs: HerbItem[];
  onChange: (herbs: HerbItem[]) => void;
}

export function HerbSelector({ herbs, onChange }: HerbSelectorProps) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dose, setDose] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (search.length >= 1) {
      fetch(`/api/herbs?q=${encodeURIComponent(search)}&limit=10`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.herbs?.map((h: { name: string }) => h.name) || []))
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
  }, [search]);

  const addHerb = (name: string) => {
    if (herbs.length >= 20) return;
    if (herbs.some((h) => h.name === name)) return;
    const d = parseFloat(dose) || 0;
    onChange([...herbs, { name, dose: d, note }]);
    setSearch("");
    setDose("");
    setNote("");
    setSuggestions([]);
  };

  const addCustomHerb = () => {
    if (!search.trim() || herbs.length >= 20) return;
    const d = parseFloat(dose) || 0;
    onChange([...herbs, { name: search.trim(), dose: d, note }]);
    setSearch("");
    setDose("");
    setNote("");
  };

  const removeHerb = (index: number) => {
    onChange(herbs.filter((_, i) => i !== index));
  };

  const updateHerb = (index: number, field: keyof HerbItem, value: string | number) => {
    const updated = [...herbs];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="搜索或输入药名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions.length > 0) addHerb(suggestions[0]);
                else addCustomHerb();
              }
            }}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => addHerb(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          type="number"
          placeholder="剂量(g)"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="备注(可选)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-32"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomHerb}
          disabled={!search.trim() || herbs.length >= 20}
        >
          添加
        </Button>
      </div>

      {herbs.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          {herbs.map((herb, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}</span>
              <Input
                value={herb.name}
                onChange={(e) => updateHerb(index, "name", e.target.value)}
                className="h-8 flex-1"
              />
              <Input
                type="number"
                value={herb.dose || ""}
                onChange={(e) => updateHerb(index, "dose", parseFloat(e.target.value) || 0)}
                className="h-8 w-20"
              />
              <span className="text-xs text-muted-foreground">g</span>
              <Input
                value={herb.note}
                onChange={(e) => updateHerb(index, "note", e.target.value)}
                placeholder="先煎/后下..."
                className="h-8 w-28"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeHerb(index)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {herbs.length}/20 味药 · 支持药名自动补全，也可直接输入
      </p>
    </div>
  );
}
