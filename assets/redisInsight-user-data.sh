#!/bin/bash

#sudo yum update -y
#sudo amazon-linux-extras install -y docker
#sudo service docker start
#sudo usermod -a -G docker ec2-user
#sudo usermod -a -G docker ssm-user
#sudo chkconfig docker on
#docker run -v redisinsight:/db -p 8001:8001 redislabs/redisinsight:latest

#https://docs.docker.com/engine/install/ubuntu/

sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo docker run hello-world
sudo docker run -p 8001:8001 redislabs/redisinsight:latest