#!/bin/bash
# Script para iniciar el sistema completo en local o preparar producción
echo "Iniciando Sistema Inteligente Generador de Datos..."

# 1. Instalar dependencias backend si no están
echo "Instalando dependencias backend..."
pip install -r backend/requirements.txt

# 2. Instalar dependencias frontend si no están
echo "Instalando dependencias frontend..."
cd frontend && npm install && cd ..

# 3. Construir frontend
echo "Construyendo aplicación frontend..."
cd frontend && npm run build && cd ..

# 4. Iniciar con PM2 (requiere pm2 instalado globalmente: npm i -g pm2)
echo "Iniciando procesos con PM2..."
pm2 start ecosystem.config.js

echo "Sistema iniciado. Usa 'pm2 logs' para ver la salida."
