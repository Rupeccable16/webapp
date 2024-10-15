#!/bin/bash

sudo cp /opt/webapp/csye6225.service /etc/systemd/system/csye6225.service
cd /etc/systemd/system

echo "daemon reload"
sudo systemctl daemon-reload

echo "enable service"
sudo systemctl enable csye6225
sudo systemctl start csye6225

echo "Status"
sudo systemctl status csye6225

echo "Logs"
sudo journalctl -u csye6225