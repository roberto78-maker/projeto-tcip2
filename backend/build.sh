#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Criar superusuário se as variáveis estiverem presentes (Render) - COMENTADO PARA EVITAR TRAVAMENTOS
# if [[ -n "$DJANGO_SUPERUSER_USERNAME" ]]; then
#     echo "Verificando/Criando superusuário..."
#     python manage.py createsuperuser --no-input || echo "Superusuário já existe ou erro na criação."
# fi

# Collect static files
python manage.py collectstatic --no-input
