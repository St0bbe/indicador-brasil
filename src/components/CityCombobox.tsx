import { useState } from "react";
import { MapPin } from "lucide-react";

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
  onChange: (value: string) => void;
}

export function CityCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const cidades = Array.from(new Set([value, ...CIDADES_PRE_CARREGADAS])).filter(Boolean);
  const selecionar = (cidade: string) => {
    onChange(cidade.trim());
    setQuery("");
  };

  return (
    <div className="w-full space-y-2">
      <label htmlFor="pesquisa-cidade" className="block text-sm font-medium">Pesquisar cidade</label>
      <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3">
        <MapPin className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
        <input
          id="pesquisa-cidade"
          type="search"
          className="h-11 min-w-0 w-full bg-transparent text-sm outline-none"
          placeholder="Digite o nome da cidade"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) selecionar(query); }}
        />
        <button type="button" disabled={!query.trim()} onClick={() => selecionar(query)}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          Buscar
        </button>
      </div>
      <select aria-label="Selecionar cidade" value={value} onChange={(event) => selecionar(event.target.value)}
        className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm">
        {cidades.map((cidade) => <option key={cidade} value={cidade}>{cidade}</option>)}
      </select>
    </div>
  );
}
