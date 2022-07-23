import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import {aws_servicediscovery as servicediscovery} from "aws-cdk-lib";
import {readFileSync} from 'fs';
import {format,utcToZonedTime} from 'date-fns-tz';

export class UbuntuEC2Stack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const testLocationIp = "10.8.80.40/32"
    const appPort = '8001'
   // const appPort = '80'

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
    const webserverSG = new ec2.SecurityGroup(this, 'webserver-sg', {
      vpc,
    });

    //Define ingress rule for security group 
    /*  OPtion 1:
    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    ); 
    */
   // Option 2:
    webserverSG.addIngressRule(
      ec2.Peer.ipv4(testLocationIp),
      ec2.Port.tcp(parseInt(appPort)),
      'allow HTTP traffic from specific location',
    );

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

  //  const userData: ec2.UserData = readFileSync('./assets/ubuntu-default-user-data.sh', 'utf8');

    const machineImage = new ec2.GenericSSMParameterImage(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
      ec2.OperatingSystemType.LINUX,
     // userData
    )

    // Define EC2 Instance and Properties:
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      // init: ec2.CloudFormationInit.fromElements(
      //   ec2.InitCommand.shellCommand('sudo apt-get update -y'),
      //   ec2.InitCommand.shellCommand('sudo apt-get install -y nginx')
      // ),
      securityGroup: webserverSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        //ec2.InstanceSize.NANO,
        ec2.InstanceSize.MEDIUM,
      ),
      machineImage: machineImage

    });

     // 👇 load user data script
    const userDataScript = readFileSync('./assets/ubuntu-default-user-data.sh', 'utf8');
    
    // 👇 add user data to the EC2 instance
    ec2Instance.addUserData(userDataScript);
 

    cdk.Tags.of(ec2Instance).add("Name", "CDK_Ubuntu")
    cdk.Tags.of(ec2Instance).add("Service", "EC2")


  let date = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const centraltime= utcToZonedTime(date,timezone)
  const timestamp = format(centraltime, `yyyy-MM-dd HH:mm:ss`) 

  new cdk.CfnOutput(this, "Timestamp", {value: timestamp }); 
  new cdk.CfnOutput(this, "public ip", {value: `${ec2Instance.instancePublicIp}:${appPort}`})

  }
  
}
