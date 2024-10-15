#!/bin/bash

echo "Creating webapp directory"
cd /opt
sudo mkdir webapp

echo "Creating group"
sudo groupadd csye6225

echo "Creating user"
sudo useradd -M -s /usr/sbin/nologin -g csye6225 csye6225
echo "User and user group created"