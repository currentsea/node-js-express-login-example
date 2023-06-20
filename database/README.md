# Pre-requisites
* Docker Desktop - download **[here](https://www.docker.com/products/docker-desktop/)** 
  * _**Do NOT download through homebrew or another package manager, as it is untested**_
* Pull down the latest version of the `postgres-plv8` docker [image](https://hub.docker.com/r/clkao/postgres-plv8/)  
```shell
$ docker pull clkao/postgres-plv8
Using default tag: latest
latest: Pulling from clkao/postgres-plv8
Digest: sha256:24fb4815fe23ed83768609d97dad349023ac93bc0cdd8c888b1465cd57cacadf
Status: Image is up to date for clkao/postgres-plv8:latest
docker.io/clkao/postgres-plv8:latest
```
Please note: Your output may slightly differ from that shown above, this is normal as long as you download the image for the container properly you are fine. 
* Run the commands below to build a docker image named `postgres/crashltc:latest`.  The `Dockerfile` located within `/database`  contains all of the logic needed to create and build the initial database
```shell
$ cd database/
$ docker build -t postgres/crashltc:latest .
[+] Building 0.8s (7/7) FINISHED                                                                                     
 => [internal] load build definition from Dockerfile                                                            0.0s
 => => transferring dockerfile: 73B                                                                             0.0s
 => [internal] load .dockerignore                                                                               0.0s
 => => transferring context: 2B                                                                                 0.0s
 => [internal] load metadata for docker.io/clkao/postgres-plv8:latest                                           0.7s
 => [internal] load build context                                                                               0.0s
 => => transferring context: 69B                                                                                0.0s
 => [1/2] FROM docker.io/clkao/postgres-plv8@sha256:24fb4815fe23ed83768609d97dad349023ac93bc0cdd8c888b1465cd57  0.0s
 => CACHED [2/2] COPY schema.sql /docker-entrypoint-initdb.d/                                                   0.0s
 => exporting to image                                                                                          0.0s
 => => exporting layers                                                                                         0.0s
 => => writing image sha256:4a06a79f608624342c7c1b13f7f3a9809d9bb3ffb92843466c4493f492026219                    0.0s
 => => naming to docker.io/postgres/crashltc:latest                                                             0.0s
```
*  **IMPORTANT** Make sure you do not have a local version of `postgresql` running as it will cause a port collision using the following commands.  
  * If you do have a port collision due to the necessity to have a local version of `postgresql`, please use a different port other than the one specified below.
* Now you will create a running version of this containerized database with port forward from port `5432` on the machine running the server to the corresponding port `5432` in the docker container, we will use our newly created `postgres/crashltc:latest` image to create a container named `crashltc_db_container`
```shell
# Note: Change the first occurrence of port 5432 if you have an already running instance of postgresql on your machine, as this will cause a port collision
$ docker run -d postgres/crashltc:latest -p 5432:5432 --name=crashltc_db_container
Unable to find image 'clkao/postgres-plv8:10-2' locally
10-2: Pulling from clkao/postgres-plv8
80369df48736: Pull complete 
b18dd0a6efec: Pull complete 
5c20c5b8227d: Pull complete 
c5a7f905c8ec: Pull complete 
5a3f55930dd8: Pull complete 
ffc097878b09: Pull complete 
3106d02490d4: Pull complete 
88d1fc513b8f: Pull complete 
f19250dffc5e: Pull complete 
756351b7a443: Pull complete 
0d24b08575ba: Pull complete 
31babd3be108: Pull complete 
16f2724dc303: Pull complete 
69802daaa561: Pull complete 
5153ff04d233: Pull complete 
Digest: sha256:954bb3db44088d7affd4e43557242455f44bc5bd8d111a55021d4e3fd3f20bb1
Status: Downloaded newer image for clkao/postgres-plv8:10-2
WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
381c7784b685d706dff60991c79654d8c31c1134be3ed473c8572a928f89920c
```

* Now make sure the `crashltc` user and `crashltcdb` database are properly created.  **Run these commands locally**
* Please note that these commands can also be ran with the included `provision.sh` script
```shell
$ export PGPASSWORD=IRONman1
$ psql --username=postgres --host=192.168.1.228:5432 -c "CREATE USER crashltc WITH SUPERUSER;"
CREATE ROLE
$ psql --username=postgres --host=192.168.1.228:5432 -c "ALTER USER crashltc WITH PASSWORD 'IRONman1';"
ALTER ROLE
$ psql --username=crashltc --host=192.168.1.228:5432 --dbname=postgres -c "CREATE DATABASE crashltcdb WITH OWNER crashltc;"
CREATE DATABASE
$ psql --username=crashltc --host=192.168.1.228:5432 --dbname=crashltcdb < schema.sql
DROP SCHEMA
CREATE SCHEMA
CREATE EXTENSION
CREATE EXTENSION
CREATE TYPE
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE SEQUENCE
ALTER SEQUENCE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
ALTER TABLE
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE TABLE
ALTER TABLE
CREATE SEQUENCE
ALTER SEQUENCE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE SEQUENCE
ALTER SEQUENCE
ALTER TABLE
ALTER TABLE
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE INDEX
ALTER TABLE
ALTER TABLE
CREATE SEQUENCE
ALTER SEQUENCE
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE TABLE
ALTER TABLE
CREATE INDEX
CREATE VIEW
CREATE TABLE
SELECT 0
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE FUNCTION
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
$ psql --username=crashltc --host=192.168.1.228:5432 --dbname=crashltcdb -c "\dt"
               List of relations
 Schema |       Name        | Type  |  Owner   
--------+-------------------+-------+----------
 public | blocks            | table | crashltc
 public | chat_messages     | table | crashltc
 public | deposit_addresses | table | crashltc
 public | deposits          | table | crashltc
 public | failedlogins      | table | crashltc
 public | fundings          | table | crashltc
 public | game_hashes       | table | crashltc
 public | games             | table | crashltc
 public | giveaways         | table | crashltc
 public | plays             | table | crashltc
 public | recovery          | table | crashltc
 public | sessions          | table | crashltc
 public | transfers         | table | crashltc
 public | users             | table | crashltc
```