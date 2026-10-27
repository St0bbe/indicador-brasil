import { useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const CIDADES_PRE_CARREGADAS = [
  "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza",
  "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre",
  "Goiânia", "Belém", "Guarulhos", "Campinas", "São Luís",
  "Maceió", "Natal", "Teresina", "João Pessoa", "Aracaju",
  "Cuiabá", "Campo Grande", "Florianópolis", "Vitória", "Porto Velho",
  "Rio Branco", "Boa Vista", "Palmas", "Macapá",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function CityCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = Array.from(new Set([value, ...CIDADES_PRE_CARREGADAS].filter(Boolean)));
  const queryTrim = query.trim();
  const hasExact = list.some((c) => c.toLowerCase() === queryTrim.toLowerCase());

  const select = (c: string) => {
    onChange(c);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="w-full space-y-2">
      <label htmlFor="pesquisa-cidade" className="block text-xs font-semibold text-foreground">
        Pesquisar cidade
      </label>
      <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 shadow-sm">
        <MapPin className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
        <input
          id="pesquisa-cidade"
          type="search"
          autoComplete="address-level2"
          aria-label="Pesquisar cidade"
          className="h-11 min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Digite o nome da cidade…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && queryTrim) select(queryTrim);
          }}
        />
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          disabled={!queryTrim}
          onClick={() => select(queryTrim)}
        >
          Buscar
        </button>
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label="Selecionar uma cidade da lista"
          className="h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm"
          value={value}
          onChange={(e) => select(e.target.value)}
        >
          {list.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {queryTrim && <p className="text-xs text-muted-foreground">Toque em Buscar ou pressione Enter para pesquisar “{queryTrim}”.</p>}
    </div>
  );
}
