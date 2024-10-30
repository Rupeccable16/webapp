#!/bin/bash

# echo "Update and Upgrade"
# apt update
# apt upgrade -y

echo "Installing unzip"
sudo apt install unzip

echo "Unzipping webapp"
sudo unzip /tmp/webapp.zip -d /opt/webapp/

# echo "Setup postgres"
# sudo apt install postgresql postgresql-contrib -y
# sudo systemctl start postgresql
# sudo systemctl enable postgresql

#Make sure .env doesnt have any spacing before and after = sign
#The following line loads env vars
#if [ -f /opt/webapp/.env ]; then     export $(grep -v '^#' .env | xargs); fi

# echo "Set up psql user, pass and db"
# sudo -u postgres psql <<EOF
# CREATE USER $PSQL_USER WITH PASSWORD '$PSQL_PASS';
# CREATE DATABASE $PSQL_DBNAME;
# GRANT ALL PRIVILEGES ON DATABASE $PSQL_DBNAME TO $PSQL_USER;
# ALTER DATABASE $PSQL_DBNAME OWNER TO $PSQL_USER;
# EOF

# echo "Postgres config edit"
# sudo sed -i 's/^local\s\+all\s\+all\s\+peer/local   all             all                                     trust/' /etc/postgresql/16/main/pg_hba.conf
# sudo sed -i 's/^host\s\+all\s\+all\s\+127\.0\.0\.1\/32\s\+scram-sha-256/host    all             all             127.0.0.1\/32            trust/' /etc/postgresql/16/main/pg_hba.conf
# sudo sed -i 's/^host\s\+all\s\+all\s\+::1\/128\s\+scram-sha-256/host    all             all             ::1\/128                 trust/' /etc/postgresql/16/main/pg_hba.conf

# echo "Restart postgres"
# sudo systemctl restart postgresql

# ls -al

ls -al

echo "Installing node"
sudo apt install nodejs -y
echo "Installing npm"
sudo apt install npm -y

echo "Installing dependencies"
cd /opt/webapp/
sudo npm i

echo "Installing CloudWatch Agent"
sudo apt-get install wget -y

echo "Download the CloudWatch Agent package"
wget https://amazoncloudwatch-agent-us-east-1.s3.us-east-1.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

echo "Install the CloudWatch Agent"
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

echo "Clean up the downloaded package"
rm -f amazon-cloudwatch-agent.deb

echo "Changing Ownership"
sudo chown -R csye6225:csye6225 "/opt/webapp/"
sudo chmod -R 755 /opt/webapp

echo "Setup done"
