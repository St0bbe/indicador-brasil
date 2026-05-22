import { useState } from "react";
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[240px] justify-between bg-card shadow-sm"
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 text-navy" />
            <span className="truncate">{value || "Selecione uma cidade"}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou digitar cidade…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {queryTrim ? (
                <button
                  onClick={() => select(queryTrim)}
                  className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Usar "{queryTrim}"
                </button>
              ) : (
                "Nenhuma cidade encontrada."
              )}
            </CommandEmpty>
            <CommandGroup heading="Cidades">
              {list.map((c) => (
                <CommandItem key={c} value={c} onSelect={() => select(c)}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
            {queryTrim && !hasExact && (
              <CommandGroup heading="Personalizada">
                <CommandItem onSelect={() => select(queryTrim)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar "{queryTrim}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
