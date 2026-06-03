with open('backend/custodia/admin_temp.py', 'r', encoding='utf-16') as f:
    text = f.read()

# Add to list_display
text = text.replace('\"vara\",\n        \"data_criacao\",', '\"vara\",\n        \"data_fato\",\n        \"data_criacao\",')

# Add to fieldsets
text = text.replace('\"fields\": (\"data_criacao\",)', '\"fields\": (\"data_fato\", \"data_criacao\",)')

with open('backend/custodia/admin.py', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)
