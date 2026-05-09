#!/usr/bin/env bash
# Build script - executado apenas durante o deploy
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Criar superusuário automaticamente se não existir
python manage.py shell << 'EOF'
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@tcip.com', 'admin123')
    print('Superusuário criado: admin / admin123')
else:
    print('Superusuário já existe')
EOF

# ============================================================
# GO LIVE: Limpar dados ficticios de teste (EXECUTAR UMA UNICA VEZ)
# REMOVER ESTE BLOCO APOS O PRIMEIRO DEPLOY BEM-SUCEDIDO!
# ============================================================
python manage.py go_live --confirm

# Collect static files
python manage.py collectstatic --no-input
