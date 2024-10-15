#!/bin/bash

# echo "Update and Upgrade"
# apt update
# apt upgrade -y

echo "Installing unzip"
apt install unzip

echo "Setup postgres"
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

#Make sure .env doesnt have any spacing before and after = sign
#The following line loads env vars
if [ -f .env ]; then     export $(grep -v '^#' .env | xargs); fi

echo "Set up psql user, pass and db"
sudo -u postgres psql <<EOF
CREATE USER $PSQL_USER WITH PASSWORD '$PSQL_PASS';
CREATE DATABASE $PSQL_DBNAME;
GRANT ALL PRIVILEGES ON DATABASE $PSQL_DBNAME TO $PSQL_USER;
ALTER DATABASE $PSQL_DBNAME OWNER TO $PSQL_USER;
EOF

echo "Postgres config edit"
sudo sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     trust/' /etc/postgresql/16/main/pg_hba.conf
sudo sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+scram-sha-256/host    all             all             127.0.0.1\/32            trust/' /etc/postgresql/16/main/pg_hba.conf
sudo sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+scram-sha-256/host    all             all             ::1\/128                 trust/' /etc/postgresql/16/main/pg_hba.conf

echo "Restart postgres"
sudo systemctl restart postgresql

echo "Installing node"
apt install nodejs -y
echo "Installing npm"
apt install npm -y

echo "Installing dependencies"
npm i
