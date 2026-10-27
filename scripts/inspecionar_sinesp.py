"""Ferramenta de inspeção da planilha oficial Sinesp VDE.

Executar: python scripts/inspecionar_sinesp.py planilha.xlsx
Exibe abas, dimensões e primeiras linhas para definir um mapeamento fiel.
"""
import sys
from openpyxl import load_workbook

if len(sys.argv) != 2:
    raise SystemExit("Uso: python scripts/inspecionar_sinesp.py planilha.xlsx")

arquivo = sys.argv[1]
workbook = load_workbook(arquivo, read_only=True, data_only=True)
for aba in workbook:
    print("ABA:", aba.title, "LINHAS:", aba.max_row, "COLUNAS:", aba.max_column)
    for linha in aba.iter_rows(min_row=1, max_row=min(aba.max_row, 8), values_only=True):
        print(repr(linha[:20]))
