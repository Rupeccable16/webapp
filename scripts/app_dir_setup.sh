#!/bin/bash


echo "Creating webapp directory"
cd /opt
sudo mkdir webapp

echo "Creating log file"
cd /var/log/
mkdir webapp
cd /var/log/webapp

echo "Creating group"
sudo groupadd csye6225

echo "Creating user"
sudo useradd -M --system -s /usr/sbin/nologin -g csye6225 csye6225
echo "User and user group created"