#!/usr/bin/env python3
"""Importação auditável da planilha oficial do Anuário FBSP 2026.

Uso: python scripts/import_anuario.py [arquivo.xlsx]
Sem argumento, baixa a planilha do site do FBSP.
Saída: data/anuario-2026-raw.json (células originais por aba).
Não infere município, categoria, ano nem soma tabelas heterogêneas.
"""
import json
import re
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

URL = "https://forumseguranca.org.br/wp-content/uploads/2026/07/anuario-2026.xlsx"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
      "p": "http://schemas.openxmlformats.org/package/2006/relationships"}
ROOT = Path(__file__).resolve().parents[1]

def parse_xlsx(path):
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.findall(".//m:t", NS)))
        book = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
        output = {}
        for sheet in book.findall("m:sheets/m:sheet", NS):
            name = sheet.attrib["name"]
            rid = sheet.attrib["{" + NS["r"] + "}id"]
            target = targets[rid].lstrip("/")
            filename = target if target.startswith("xl/") else "xl/" + target
            root = ET.fromstring(z.read(filename))
            rows = []
            for row in root.findall(".//m:sheetData/m:row", NS):
                cells = {}
                for c in row.findall("m:c", NS):
                    v = c.find("m:v", NS)
                    inline = c.find("m:is", NS)
                    if v is None and inline is None:
                        continue
                    value = v.text if v is not None else "".join(t.text or "" for t in inline.findall(".//m:t", NS))
                    if c.attrib.get("t") == "s":
                        value = shared[int(value)]
                    elif c.attrib.get("t") not in ("str", "inlineStr", "e", "b") and value is not None:
                        try:
                            value = float(value) if "." in value or "E" in value.upper() else int(value)
                        except ValueError:
                            pass
                    cells[c.attrib["r"]] = value
                if cells:
                    rows.append(cells)
            output[name] = rows
        return output

def main():
    if len(sys.argv) > 1:
        path = Path(sys.argv[1])
    else:
        path = ROOT / "data" / "anuario-2026.xlsx"
        path.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(URL, headers={"User-Agent": "IndicadorBrasil/1.0"})
        with urllib.request.urlopen(req, timeout=60) as response:
            path.write_bytes(response.read())
    if not zipfile.is_zipfile(path):
        raise ValueError("Arquivo não é XLSX válido.")
    data = {"fonte": "Fórum Brasileiro de Segurança Pública", "publicacao": "Anuário Brasileiro de Segurança Pública 2026",
            "anoPublicacao": 2026, "url": URL, "importadoEm": datetime.now(timezone.utc).isoformat(),
            "aviso": "Células brutas: validar cabeçalhos, notas metodológicas, abrangência e período antes de calcular índices.",
            "abas": parse_xlsx(path)}
    out = ROOT / "data" / "anuario-2026-raw.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Importadas {len(data['abas'])} abas para {out}")
if __name__ == "__main__":
    main()
