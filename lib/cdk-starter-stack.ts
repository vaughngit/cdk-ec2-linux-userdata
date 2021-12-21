import * as ec2 from '@aws-cdk/aws-ec2';
//import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import {App, Stack, Construct, Tags, StackProps} from '@aws-cdk/core';
import {readFileSync} from 'fs';

export class CdkStarterStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'default-vpc', {
      isDefault: true,
    });

    const webserverSG = new ec2.SecurityGroup(this, 'webserver-sg', {
      vpc,
    });

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    const role =  new iam.Role(this, 'test', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'SSM IAM role in AWS CDK',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    })

    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: webserverSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.NANO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
    });

    // 👇 load user data script
    const userDataScript = readFileSync('./lib/user-data.sh', 'utf8');
    // 👇 add user data to the EC2 instance
    ec2Instance.addUserData(userDataScript);

    Tags.of(ec2Instance).add("Name", "CDK-SSMSessionRunAs")
  }
  
    
  
}
