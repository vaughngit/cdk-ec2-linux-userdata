    const userData = ec2.UserData.forLinux()

    userData.addCommands(
      'apt-get update -y',
      'apt-get install -y git awscli ec2-instance-connect',
      'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done',
      'cd /quickstart-linux-utilities',
      'source quickstart-cfn-tools.source',
      'qs_update-os || qs_err',
      'qs_bootstrap_pip || qs_err',
      'qs_aws-cfn-bootstrap || qs_err',
      'mkdir -p /opt/aws/bin',
      'ln -s /usr/local/bin/cfn-* /opt/aws/bin/',
      'mongod --version',
      'curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -',
      'apt-key list',
      'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list',
      'sudo apt update',
      'sudo apt install -y mongodb-org',
      'mongod --version',
      'sudo systemctl start mongod.service',
      'sudo systemctl status mongod',
      'sudo systemctl enable mongod',
      "mongo --eval 'db.runCommand({ connectionStatus: 1 })'"
    )
