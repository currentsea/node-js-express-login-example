# crashrewrite-backend 

## Building the database 
* You need docker to build the database
```shell
$ cd database/ 
$ docker build -t crashdb:latest .
```
* This will create an image named `crashdb:latest` that you can now run by exposing port 5432 on your local IP to port 5432 on the container.
```shell
$ brew update && brew upgrade 
$ brew install ip
# Your interface may be slightly different 
$ export MY_IP=`ipconfig getifaddr en0`
$ docker run -d -p $MY_IP:5432:5432 crashdb:latest
```
* Make sure you also have postgresql installed locally 
```shell
$ brew update && brew upgrade && brew install postgresql
```