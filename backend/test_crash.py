import os
import django
import json
import sys

# Add current directory to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User

client = Client()
user = User.objects.filter(is_superuser=True).first() or User.objects.first()
if not user:
    print("No user found")
    exit(1)

client.force_login(user)
# Test with the parameters from the screenshot
params = {
    'data_inicio': '2026-02-01',
    'data_fim': '2026-04-30'
}
response = client.get('/api/relatorios/incineracao/', data=params)
print(f"Status: {response.status_code}")
if response.status_code == 500:
    print(response.content.decode('utf-8'))
else:
    print(response.content.decode('utf-8')[:500])
