
## How to List Users in Linux: Local user information is stored in the /etc/passwd file. Each line in this file represents login information for one user.
   >  getent passwd
   > getent passwd | grep testuser

   sudo useradd testuser 

* ` sudo useradd first.last@domain.com ` Does not work

Reference: https://www.lifewire.com/create-users-useradd-command-3572157


# How to yum install Node.JS on Amazon Linux
   https://stackoverflow.com/questions/27350634/how-to-yum-install-node-js-on-amazon-linux
   sudo amazon-linux-extras install epel
   curl --silent --location https://rpm.nodesource.com/setup_16.x | bash -
   sudo yum -y install nodejs


# Redis Resources:
   Install RedisInsight on AWS EC2: https://docs.redis.com/latest/ri/installing/install-ec2/
   
# ATTO Disk Benchmark for Windows
## Industry Standard Application for Analyzing Storage Performance
https://www.atto.com/disk-benchmark/
