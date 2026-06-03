import re

with open('backend/custodia/admin.py', 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    '­ƒôï Identifica+º+úo': '?? Identificação',
    '­ƒº¬ Material': '?? Material',
    '­ƒôü Documentos': '?? Documentos',
    '­ƒôª Cust+¦dia': '?? Custódia',
    'ÔØî Exclus+úo': '? Exclusão',
    '­ƒôà Datas': '?? Datas',
    '­ƒôä Documenta+º+úo (Of+¡cio)': '?? Documentação (Ofício)',
    'Aguardando Confer+¬ncia': 'Aguardando Conferência',
    'Exclu+¡do': 'Excluído'
}

for k, v in replacements.items():
    text = text.replace(k, v)

with open('backend/custodia/admin.py', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)
