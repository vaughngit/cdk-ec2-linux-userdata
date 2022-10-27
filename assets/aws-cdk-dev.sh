      'apt-get update -y',
      'apt-get install -y git awscli ec2-instance-connect',
      'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done',
      'cd /quickstart-linux-utilities',

