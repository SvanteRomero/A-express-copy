#!/bin/bash

echo "Installing Backend Dependencies..."
cd django_backend
pip install -r requirements.txt
python manage.py migrate

echo "Installing Frontend Dependencies..."
cd ../
npm install

echo "Setup Complete! You can now run servers."