#/usr/bin/env bash
apt-get update -y;
apt-get install -y git awscli ec2-instance-connect;
until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done;
cd /quickstart-linux-utilities;
source quickstart-cfn-tools.source;
qs_update-os || qs_err;
qs_bootstrap_pip || qs_err;
qs_aws-cfn-bootstrap || qs_err;
mkdir -p /opt/aws/bin;
ln -s /usr/local/bin/cfn-* /opt/aws/bin/;