#!/bin/bash
export PGPASSWORD='crashltcdevpassword'
export PGUSER='crashltc'
export PGDATABASE='crashltcdb'
#sudo -u postgres psql -c "ALTER USER crashltc WITH SUPERUSER"
echo "Creating the database"
sudo -u postgres createdb -O crashltc crashltcdb
psql -f webserver/server/sql/schema.sql
#sudo -u postgres psql -c "ALTER USER crashltc WITH NOSUPERUSER"
