FROM php:8.1-cli

# Instalar extensiones necesarias para MySQL PDO
RUN apt-get update && apt-get install -y \
    libpq-dev \
    && docker-php-ext-install pdo pdo_mysql

# Copiar el código del proyecto
COPY . /app
WORKDIR /app

# Iniciar el servidor de desarrollo integrado de PHP en el puerto que asigne Railway
CMD php -S 0.0.0.0:${PORT:-8080}
