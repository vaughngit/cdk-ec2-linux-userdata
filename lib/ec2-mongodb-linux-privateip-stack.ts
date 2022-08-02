import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import {aws_servicediscovery as servicediscovery} from "aws-cdk-lib";
import {readFileSync} from 'fs';
import {format,utcToZonedTime} from 'date-fns-tz';

export class MongoDbDeployStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const testLocationIp = "10.8.80.40/32"
    //const appPort = '8001'
    const appPort = "27017"

    //Setup VPC Configuration////////////////////////////////////////////////////////////////////////
    
   //Resuse VPC Option 1:    
    const vpcId =  ssm.StringParameter.valueFromLookup( this, `/tnc/dev/vpcId`    );
    const vpc = ec2.Vpc.fromLookup(this, `reference vpc from vpcid stored in ssm params`, { vpcId: vpcId });
 

  /*  //Resuse VPC Option 2:  
   const vpc = ec2.Vpc.fromLookup(this, `reference vpc from tags`, { 
    tags:{
      solution: "awesomeSolution",
      environment: "dev"
    }
    });
 */
    //VPC Reference Option 3: 
   // const vpc = ec2.Vpc.fromLookup(this, 'default vpc in account', { isDefault: true,  });
   
    // Create new Security Group for EC2 Instance: 
    const appserverSG = new ec2.SecurityGroup(this, 'app-server-sg', {
      vpc,
    });

    //Define ingress rule for security group 
    //  OPtion 1:
    appserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(parseInt(appPort)),
      'allow app traffic from anywhere',
    ); 

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


    const machineImage = new ec2.GenericSSMParameterImage(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
      ec2.OperatingSystemType.LINUX,
      userData
    )
    
/* 
   // Option 2:
    webserverSG.addIngressRule(
      ec2.Peer.ipv4(testLocationIp),
      ec2.Port.tcp(parseInt(appPort)),
      'allow app traffic from specific location',
    );

     */
    // Define EC2 Instance Role:  
    const role =  new iam.Role(this, 'ec2-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'SSM IAM role in AWS CDK',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    })

    // Define EC2 Instance and Properties:
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role,
      vpcSubnets: {
        //subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: appserverSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        //ec2.InstanceSize.NANO,
        ec2.InstanceSize.SMALL,
      ),
      // machineImage: new ec2.AmazonLinuxImage({
      //   generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      // }),
      machineImage: machineImage
    });

    // 👇 load user data script
    //const userDataScript = readFileSync('./assets/mongodb-user-data.sh', 'utf8');
    
    // 👇 add user data to the EC2 instance
    //ec2Instance.addUserData(userDataScript);


    cdk.Tags.of(ec2Instance).add("Name", "CDK_MongoDb_EC2")
    cdk.Tags.of(ec2Instance).add("Service", "EC2")


  let date = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const centraltime= utcToZonedTime(date,timezone)
  const timestamp = format(centraltime, `yyyy-MM-dd HH:mm:ss`) 

  new cdk.CfnOutput(this, "Timestamp", {value: timestamp }); 
  new cdk.CfnOutput(this, "public ip", {value: `${ec2Instance.instancePublicIp}:${appPort}`})
  new cdk.CfnOutput(this, "private ip", {value: `${ec2Instance.instancePrivateIp}:${appPort}`})
  }
  
}
