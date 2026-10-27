#!/usr/bin/env python3
"""Extrai todas as páginas dos PDFs oficiais para JSON auditável.
Uso:
  pip install pymupdf
  python scripts/importar_pdfs_oficiais.py "Anuário Brasileiro de Segurança Pública 2026.pdf" "Atlas_da_violencia_2026.pdf"
Não converte automaticamente texto de tabela em índice: exige validação dos cabeçalhos e notas.
"""
import json
import sys
from pathlib import Path

def main():
    try:
        import fitz
    except ImportError as exc:
        raise SystemExit("Instale PyMuPDF: python -m pip install pymupdf") from exc
    if len(sys.argv) != 3:
        raise SystemExit("Informe o PDF do Anuário e o PDF do Atlas, nesta ordem.")
    base = Path(__file__).resolve().parents[1]
    output = base / "data" / "fontes-oficiais"
    output.mkdir(parents=True, exist_ok=True)
    for nome, arquivo in zip(("anuario-2026", "atlas-2026"), sys.argv[1:]):
        path = Path(arquivo)
        if not path.is_file():
            raise SystemExit(f"Arquivo não encontrado: {path}")
        with fitz.open(path) as pdf:
            paginas = [{"pagina": i + 1, "texto": page.get_text(sort=True)}
                       for i, page in enumerate(pdf)]
        documento = {
            "publicacao": nome,
            "tipo": "extracao_documental_bruta",
            "aviso": "Textos extraídos das páginas originais. Não são indicadores normalizados: verificar cabeçalhos, anos, unidades e notas antes de publicar cálculos.",
            "paginas": paginas,
        }
        destino = output / f"{nome}-paginas.json"
        destino.write_text(json.dumps(documento, ensure_ascii=False), encoding="utf-8")
        print(f"{nome}: {len(paginas)} páginas extraídas em {destino}")
if __name__ == "__main__":
    main()
