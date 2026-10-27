"""Agrega registros mensais oficiais Sinesp VDE sem misturar abrangências.

Uso: python scripts/importar_sinesp_mensal.py sinesp.xlsx 2025
Saída: src/data/sinesp-mensal-2025.json
"""
import datetime as dt
import json
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from openpyxl import load_workbook

CAMPOS = {"uf", "municipio", "evento", "data_referencia", "total", "abrangencia"}

def texto(v):
    s = unicodedata.normalize("NFKD", str(v or ""))
    return "".join(c for c in s if not unicodedata.combining(c)).strip().casefold()

def inteiro(v):
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)) and float(v).is_integer() and v >= 0:
        return int(v)
    if isinstance(v, str) and v.strip().isdigit():
        return int(v.strip())
    return None

def importar(arquivo, ano):
    wb = load_workbook(arquivo, read_only=True, data_only=True)
    totais = defaultdict(int)
    contagem = 0
    rejeitadas = 0
    abrangencias = defaultdict(int)
    for aba in wb:
        linhas = aba.iter_rows(values_only=True)
        cabecalho = next(linhas, None)
        if not cabecalho:
            continue
        pos = {texto(v): i for i, v in enumerate(cabecalho)}
        if not CAMPOS.issubset(pos):
            continue
        for linha in linhas:
            def campo(k):
                return linha[pos[k]] if pos[k] < len(linha) else None
            data = campo("data_referencia")
            valor = inteiro(campo("total"))
            uf = str(campo("uf") or "").strip().upper()
            municipio = str(campo("municipio") or "").strip()
            evento = str(campo("evento") or "").strip()
            abrangencia = str(campo("abrangencia") or "").strip()
            abrangencias[abrangencia] += 1
            if not isinstance(data, (dt.datetime, dt.date)) or data.year != ano:
                rejeitadas += 1
                continue
            if not uf or not evento or valor is None:
                rejeitadas += 1
                continue
            # Não somar recortes de agentes, sexo, idade e armas:
            # apenas linhas sem estratificação, que representam totais.
            if any(campo(c) not in (None, "") for c in
                   ("agente", "arma", "faixa_etaria")
                   if c in pos):
                rejeitadas += 1
                continue
            chave = (uf, municipio, evento, data.month, abrangencia)
            totais[chave] += valor
            contagem += 1
    wb.close()
    if not totais:
        raise ValueError("Nenhum registro agregado: conferir cabecalhos e regras da planilha")
    registros = [
        {"uf": uf, "municipio": municipio, "evento": evento, "ano": ano,
         "mes": mes, "abrangencia": abrangencia, "total": valor}
        for (uf, municipio, evento, mes, abrangencia), valor in sorted(totais.items())
    ]
    destino = Path(f"src/data/sinesp-mensal-{ano}.json")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps({
        "fonte": "Sinesp VDE - Ministerio da Justica",
        "url_fonte": "https://www.gov.br/mj/pt-br/assuntos/sua-seguranca/seguranca-publica/estatistica/download/dnsp-base-de-dados",
        "ano": ano, "metrica": "total", "registros": registros
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Linhas usadas: {contagem}; rejeitadas: {rejeitadas}")
    print("Abrangencias encontradas:", dict(abrangencias))
    print(f"Registros mensais agregados: {len(registros)}")
    print("Arquivo:", destino)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Uso: python scripts/importar_sinesp_mensal.py arquivo.xlsx ANO")
    importar(Path(sys.argv[1]), int(sys.argv[2]))
