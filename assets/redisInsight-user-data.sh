#!/bin/bash

sudo yum update -y
sudo amazon-linux-extras install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo usermod -a -G docker ssm-user
sudo chkconfig docker on
#docker run -v redisinsight:/db -p 8001:8001 redislabs/redisinsight:latest
