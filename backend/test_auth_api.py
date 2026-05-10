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
response = client.get('/api/relatorios/incineracao/')
print(f"Status: {response.status_code}")
if response.status_code == 500:
    print(response.content.decode('utf-8'))
else:
    # Print a snippet of results if success
    print(response.content.decode('utf-8')[:500])
