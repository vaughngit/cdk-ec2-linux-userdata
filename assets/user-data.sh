#!/bin/bash

sudo su
yum update -y
yum install -y httpd

systemctl start httpd
systemctl enable httpd

echo "<h1>Hello World from $(hostname -f)</h1>" > /var/www/html/index.html

#hostname: outlook
#fqdn: com
#fqdn: mynode.example.com
#manage_etc_hosts: true
hostnamectl set-hostname outlook.com 
useradd testuser
useradd sysadmin
