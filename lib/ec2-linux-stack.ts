import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import {readFileSync} from 'fs';

export class EC2DeployStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const testLocationIp = "10.8.80.40/32"

    
/*   //Resuse VPC Option 1:    
    const vpcId =  ssm.StringParameter.valueFromLookup( this, `/solution/dev/vpcId`    );
    const vpc = ec2.Vpc.fromLookup(this, `reference vpc from vpcid stored in ssm params`, { vpcId: vpcId });
 */

  /*  //Resuse VPC Option 2:  
   const vpc = ec2.Vpc.fromLookup(this, `reference vpc from tags`, { 
    tags:{
      solution: "awesomeSolution",
      environment: "dev"
    }
    });
 */
    //VPC Reference Option 3: 
    const vpc = ec2.Vpc.fromLookup(this, 'default vpc in account', { isDefault: true,  });
   
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
      ec2.Port.tcp(80),
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

    // Define EC2 Instance and Properties:
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
    const userDataScript = readFileSync('./assets/user-data.sh', 'utf8');
    
    // 👇 add user data to the EC2 instance
    ec2Instance.addUserData(userDataScript);

    cdk.Tags.of(ec2Instance).add("Name", "CDK_Linux_EC2")
    cdk.Tags.of(ec2Instance).add("Service", "EC2")
  }
  
    
  
}
