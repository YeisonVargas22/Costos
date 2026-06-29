FROM php:8.1-apache

# Habilitar el módulo rewrite de Apache
RUN a2enmod rewrite

# Instalar la extensión PDO MySQL requerida para la base de datos
RUN docker-php-ext-install pdo pdo_mysql

# Copiar los archivos del proyecto al directorio web de Apache
COPY . /var/www/html/

# Dar permisos correctos a los archivos
RUN chown -R www-data:www-data /var/www/html

# Exponer el puerto 80 (Railway redirigirá el tráfico aquí automáticamente)
EXPOSE 80
