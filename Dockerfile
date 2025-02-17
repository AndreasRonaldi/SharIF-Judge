# Menggunakan image PHP 7.3 sebagai base image
FROM php:7.3-apache

# Install dependensi dan ekstensi PHP yang dibutuhkan untuk CodeIgniter
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
	libldap2-dev \
	libcurl4 \
    libcurl4-openssl-dev \
	libzip-dev \
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
	
RUN docker-php-ext-install curl

RUN  docker-php-ext-configure ldap --with-libdir=lib/x86_64-linux-gnu/ \
	&& docker-php-ext-install ldap

RUN docker-php-ext-install fileinfo
RUN docker-php-ext-install mbstring
RUN docker-php-ext-install zip

RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini && \
        sed -i -e "s/^ *memory_limit.*/memory_limit = 4G/g" /usr/local/etc/php/php.ini && \
        sed -i -e "s/^ *max_input_vars.*/max_input_vars = 3000000/g" /usr/local/etc/php/php.ini && \
        sed -i -e "s/^ *post_max_size.*/post_max_size = 50M/g" /usr/local/etc/php/php.ini && \
        sed -i -e "s/^ *upload_max_filesize.*/upload_max_filesize = 50M/g" /usr/local/etc/php/php.ini

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
