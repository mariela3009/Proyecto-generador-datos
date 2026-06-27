# 🚀 Guía de Despliegue — VPS Elastika
## Sistema Inteligente Generador de Datos

> **Stack**: FastAPI (Python 3.11+) · Next.js 16 · MySQL · PM2 · Nginx

---

## 📋 Requisitos Previos en la VPS

Antes de empezar necesitas tener acceso SSH a tu VPS de Elastika y los siguientes datos a mano:

| Dato | Ejemplo |
|---|---|
| IP pública de tu VPS | `185.x.x.x` |
| Dominio apuntado a esa IP | `tudominio.com` |
| Usuario SSH | `root` o usuario con sudo |

---

## Paso 1 — Conectarse a la VPS

```bash
ssh root@TU_IP_ELASTIKA
```

---

## Paso 2 — Actualizar el servidor

```bash
apt update && apt upgrade -y
```

---

## Paso 3 — Instalar dependencias del sistema

```bash
# Herramientas base
apt install -y git curl wget build-essential unzip

# Nginx
apt install -y nginx

# MySQL Server
apt install -y mysql-server
mysql_secure_installation
```

---

## Paso 4 — Instalar Python 3.11+

```bash
apt install -y python3.11 python3.11-venv python3-pip python3.11-dev

# Verificar
python3.11 --version
```

---

## Paso 5 — Instalar Node.js 20 (LTS) y PM2

```bash
# Instalar Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar versiones
node -v   # debe ser v20.x
npm -v

# Instalar PM2 globalmente
npm install -g pm2
pm2 startup systemd   # <- ejecuta el comando que PM2 te indique
```

---

## Paso 6 — Configurar MySQL

```bash
mysql -u root -p
```

Dentro de la consola MySQL:

```sql
CREATE DATABASE datagenerator_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'datagenerator'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CONTRASEÑA_SEGURA';
GRANT ALL PRIVILEGES ON datagenerator_db.* TO 'datagenerator'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> [!IMPORTANT]
> Guarda bien el usuario y contraseña MySQL, los necesitarás en las variables de entorno.

---

## Paso 7 — Subir el código al servidor

**Opción A — Desde Git (recomendado):**

```bash
cd /var/www
git clone https://github.com/TU_USUARIO/TU_REPO.git data-generator
cd data-generator
```

**Opción B — Subir con SCP desde tu PC Windows:**

```powershell
# Ejecuta esto en tu PC local (PowerShell)
scp -r C:\Users\HP\Downloads\DATA-GENERATOR root@TU_IP:/var/www/data-generator
```

---

## Paso 8 — Configurar variables de entorno del Backend

```bash
cd /var/www/data-generator
cp .env .env.production
nano .env.production
```

Edita estos valores **obligatoriamente**:

```env
# ── Base de datos ──────────────────────────────────────────────
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=datagenerator
MYSQL_PASSWORD=CAMBIA_ESTA_CONTRASEÑA_SEGURA
MYSQL_DB=datagenerator_db

# ── JWT ────────────────────────────────────────────────────────
JWT_SECRET_KEY=genera_una_clave_aleatoria_de_64_chars_aqui

# ── OAuth — Google ─────────────────────────────────────────────
GOOGLE_CLIENT_ID=tu_google_client_id_real
GOOGLE_CLIENT_SECRET=tu_google_client_secret_real

# ── OAuth — GitHub ─────────────────────────────────────────────
GITHUB_CLIENT_ID=tu_github_client_id_real
GITHUB_CLIENT_SECRET=tu_github_client_secret_real

# ── Frontend / CORS ────────────────────────────────────────────
FRONTEND_URL=https://tudominio.com
ALLOWED_ORIGINS=https://tudominio.com

# ── Superadmin ─────────────────────────────────────────────────
SUPERADMIN_EMAIL=admin@tudominio.com
SUPERADMIN_PASSWORD=UnaContraseñaMuySegura123!

# ── Archivos temporales ────────────────────────────────────────
TEMP_DIR=/var/www/data-generator/tmp_exports
```

> [!TIP]
> Para generar una clave JWT segura: `python3 -c "import secrets; print(secrets.token_hex(32))"`

Luego copia el archivo como `.env` principal:

```bash
cp .env.production .env
```

---

## Paso 9 — Instalar dependencias del Backend

```bash
cd /var/www/data-generator

# Crear entorno virtual
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r backend/requirements.txt
```

---

## Paso 10 — Inicializar la base de datos

```bash
# (con el venv activado)
python -m backend.core.init_db
python migrate_conexiones.py
```

Deberías ver:
```
✅ Tablas creadas correctamente.
✅ Superadmin creado: admin@tudominio.com
```

---

## Paso 11 — Configurar variables de entorno del Frontend

```bash
cd /var/www/data-generator/frontend
nano .env.local
```

Contenido del archivo:

```env
NEXTAUTH_URL=https://tudominio.com
NEXTAUTH_SECRET=otra_clave_secreta_aleatoria_muy_larga_aqui
NEXT_PUBLIC_API_URL=https://tudominio.com/api/v1

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id_real
GOOGLE_CLIENT_SECRET=tu_google_client_secret_real
```

> [!TIP]
> Para generar NEXTAUTH_SECRET: `openssl rand -base64 32`

---

## Paso 12 — Build de producción del Frontend

```bash
cd /var/www/data-generator/frontend
npm install
npm run build
```

Esto genera la carpeta `.next/` optimizada para producción. Puede tardar 2-5 minutos.

---

## Paso 13 — Actualizar el ecosystem.config.js para producción

```bash
cd /var/www/data-generator
nano ecosystem.config.js
```

Reemplaza el contenido con:

```js
module.exports = {
  apps: [
    {
      name: "generador-frontend",
      script: "npm",
      args: "run start",
      cwd: "/var/www/data-generator/frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "generador-backend",
      script: "/var/www/data-generator/venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8000 --workers 2",
      cwd: "/var/www/data-generator",
      env: {
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: "/var/www/data-generator"
      }
    }
  ]
};
```

---

## Paso 14 — Iniciar los servicios con PM2

```bash
cd /var/www/data-generator
pm2 start ecosystem.config.js

# Verificar que ambos procesos están corriendo
pm2 status

# Guardar para que arranquen al reiniciar la VPS
pm2 save
```

---

## Paso 15 — Configurar Nginx

```bash
nano /etc/nginx/sites-available/data-generator
```

Pega la siguiente configuración (reemplaza `tudominio.com`):

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Redirige HTTP a HTTPS (se activa después de instalar SSL)
    # return 301 https://$host$request_uri;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend (FastAPI) — accesible en /api/v1/
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Docs de FastAPI (opcional, quitar en producción si no quieres exponerlas)
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
    }

    client_max_body_size 50M;
}
```

Activa el sitio:

```bash
ln -s /etc/nginx/sites-available/data-generator /etc/nginx/sites-enabled/
nginx -t          # verifica que no hay errores de sintaxis
systemctl restart nginx
```

---

## Paso 16 — Instalar SSL con Let's Encrypt (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com -d www.tudominio.com
```

Certbot actualizará el `nginx.conf` automáticamente. Cuando lo haga, **descomenta** la línea de redirección HTTP→HTTPS que dejamos en el paso 15:

```nginx
return 301 https://$host$request_uri;
```

Y recarga nginx:

```bash
systemctl reload nginx
```

---

## Paso 17 — Verificar el despliegue

```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs

# Probar backend directamente
curl http://127.0.0.1:8000/

# Probar a través de Nginx
curl https://tudominio.com/api/v1/
```

---

## 🔥 Comandos útiles de mantenimiento

```bash
# Reiniciar todos los servicios
pm2 restart all

# Ver logs del backend
pm2 logs generador-backend

# Ver logs del frontend
pm2 logs generador-frontend

# Actualizar código (desde Git)
cd /var/www/data-generator
git pull origin main
cd frontend && npm run build && cd ..
pm2 restart all

# Recargar Nginx
systemctl reload nginx
```

---

## ⚠️ Checklist final antes de ir a producción

- [ ] Cambiar `JWT_SECRET_KEY` por una clave aleatoria de 64+ chars
- [ ] Cambiar `NEXTAUTH_SECRET` por una clave generada con `openssl rand -base64 32`
- [ ] Cambiar `MYSQL_PASSWORD` por una contraseña fuerte
- [ ] Cambiar `SUPERADMIN_PASSWORD` por una contraseña segura
- [ ] Configurar credenciales reales de Google OAuth y actualizar en Google Console los **Authorized redirect URIs** a `https://tudominio.com/api/auth/callback/google`
- [ ] Configurar credenciales reales de GitHub OAuth y actualizar `Homepage URL` y `Callback URL` en GitHub Developer Settings
- [ ] Verificar que el firewall solo expone los puertos 22, 80 y 443:
  ```bash
  ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
  ```
- [ ] SSL instalado y HTTPS funcionando
- [ ] `pm2 save` ejecutado para que los procesos sobrevivan reinicios

---

## 🛟 Solución de problemas comunes

| Problema | Solución |
|---|---|
| `502 Bad Gateway` en Nginx | Verificar que PM2 está corriendo: `pm2 status` |
| Backend no conecta a MySQL | Revisar credenciales en `.env` y que MySQL está activo: `systemctl status mysql` |
| `pm2 logs` muestra error de módulo Python | Asegurarse de usar el uvicorn del venv: `venv/bin/uvicorn` |
| Frontend muestra pantalla en blanco | Ejecutar `npm run build` antes de `pm2 start` |
| Certificado SSL no se renueva | Verificar cron de certbot: `certbot renew --dry-run` |
