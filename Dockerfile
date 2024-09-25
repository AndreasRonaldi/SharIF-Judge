# Menggunakan image PHP 7.3 sebagai base image
FROM php:7.3-apache

# Install dependensi dan ekstensi PHP yang dibutuhkan untuk CodeIgniter
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
	default-jdk \
	g++ \
	python2 \
	python3

# Install ekstensi GD dan mysqli
RUN docker-php-ext-configure gd --with-freetype-dir=/usr/include/ --with-jpeg-dir=/usr/include/ \
    && docker-php-ext-install gd mysqli

# Aktifkan mod_rewrite untuk Apache
RUN a2enmod rewrite

# Copy kode CodeIgniter ke dalam container
COPY . /var/www/html/

# Set direktori kerja
WORKDIR /var/www/html/

# Make Folder tester writeable by PHP
RUN chmod 777 /var/www/html/restricted/tester
RUN chmod 777 /var/www/html/application/cache/Twig

# Expose port 80
EXPOSE 80

# Jalankan Apache server
CMD ["apache2-foreground"]
