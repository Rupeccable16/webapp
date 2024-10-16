#!/bin/bash

export DEBIAN_FRONTEND=noninteractive

echo "Updating and upgrading"
sudo apt-get update
sudo apt-get upgrade -y
echo "Upgraded OS"