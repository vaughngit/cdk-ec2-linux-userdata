#!/bin/bash

sudo su

#hostname: outlook
#fqdn: com
#fqdn: mynode.example.com
#manage_etc_hosts: true
hostnamectl set-hostname outlook.com 
useradd testuser
useradd sysadmin
