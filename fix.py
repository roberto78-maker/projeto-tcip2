with open('backend/custodia/admin.py', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace('\"data_criacao\",', '\"data_fato\",\n        \"data_criacao\",')
text = text.replace('\"data_criacao\",\n    )', '\"data_fato\",\n        \"data_criacao\",\n    )')
with open('backend/custodia/admin.py', 'w', encoding='utf-8', newline='') as f:
    f.write(text)
