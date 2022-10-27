import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps, Duration, CfnOutput, Tags, Size } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import {aws_servicediscovery as servicediscovery} from "aws-cdk-lib";
import {readFileSync} from 'fs';
import * as fs from 'fs';
import * as path from 'path'
import {format,utcToZonedTime} from 'date-fns-tz';
import { CfnKeyPair } from 'aws-cdk-lib/aws-ec2';

interface IStackProps extends StackProps {
  solutionName: string;
  serviceName: string;  
  appPort: number;
  ec2KeyName: string; 
  testingLocation: string; 
  environment: string; 
  costcenter: string; 
  dtstamp: string; 
}

export class UbuntuEc2UserdataStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: IStackProps) {
    super(scope, id, props);

   // const testLocationIp = "10.8.80.40/32"
    //const appPort = '8001'
   // const appPort = "27017"

    //Setup VPC Configuration////////////////////////////////////////////////////////////////////////
    
  /*  //Resuse VPC Option 2:  
   const vpc = ec2.Vpc.fromLookup(this, `reference vpc from tags`, { 
    tags:{
      solution: "awesomeSolution",
      environment: "dev"
    }
    });
 */
    //VPC Reference Option 3: 
 //   const vpc = ec2.Vpc.fromLookup(this, 'default vpc in account', { isDefault: true,  });


   //import the VPC 
   const vpcId = ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/vpcId`)
   const vpc = ec2.Vpc.fromLookup(this, `${props.solutionName}-import-vpc`, { vpcId });

    // Create new Security Group for EC2 Instance: 
    const appserverSG = new ec2.SecurityGroup(this, 'app-server-sg', { vpc,  });

    //Define ingress rule for security group 
    //  OPtion 1:
    appserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(props.appPort),
      'allow app traffic from anywhere',
    ); 

       // Option 2:
    // appserverSG.addIngressRule(
    //   ec2.Peer.ipv4(props.testLocationIp),
    //   ec2.Port.tcp(parseInt(appPort)),
    //   'allow app traffic from specific location',
    // );

    // 👇 import security groups by ID
    const ec2SgIdSsmParam = ssm.StringParameter.valueFromLookup(this,`/${props.solutionName}/${props.environment}/ec2SgId`)
    const ec2SG = ec2.SecurityGroup.fromSecurityGroupId(this,'imported-sg',  ec2SgIdSsmParam  );
    ec2SG.connections.allowFrom(
      new ec2.Connections({
        securityGroups: [appserverSG],
      }),
      ec2.Port.allTraffic(),
      `allow traffic on port from the ALB security group through to ecs security group`,
    )


    //user data: 
    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      'apt-get update -y',
      'apt-get install -y git awscli ec2-instance-connect',
      'cd /',
      'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done',
      'until git clone https://github.com/vaughngit/aws-cdk.git; do echo "Retrying"; done',
      'cd /aws-cdk'
    )


  const machineImage = new ec2.GenericSSMParameterImage(
    '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id',
    ec2.OperatingSystemType.LINUX,
    userData
  )
    


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


  const rootVolume: ec2.BlockDevice = {
    deviceName: '/dev/sda1', // Use the root device name from Step 1
    //volume: ec2.BlockDeviceVolume.ebs(50), // Override the volume size in Gibibytes (GiB)
    volume: ec2.BlockDeviceVolume.ebs(500)
  };

    // Define EC2 Instance and Properties:
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role,
      vpcSubnets: {
        //subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      blockDevices: [rootVolume],
      securityGroup: appserverSG,
      keyName: props.ec2KeyName, 
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        //ec2.InstanceSize.NANO,
        ec2.InstanceSize.SMALL,
      ),
      machineImage: machineImage
    });

    
      // InstanceID SSM Param
  new ssm.StringParameter(this, 'vpcid ssm param', {
    parameterName: `/${props.solutionName}/${props.environment}/instanceId`,
    stringValue: ec2Instance.instanceId,
    description: `param for /${props.solutionName}/${props.environment}/ instanceId`,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.INTELLIGENT_TIERING,
    allowedPattern: '.*',
  });


    cdk.Tags.of(this).add("Name", props.serviceName)
    cdk.Tags.of(this).add("Service", "EC2")
    Tags.of(this).add("solution", props.solutionName)
    Tags.of(this).add("environment", props.environment)
    Tags.of(this).add("costcenter", props.costcenter)


  let date = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const centraltime= utcToZonedTime(date,timezone)
  const timestamp = format(centraltime, `yyyy-MM-dd HH:mm:ss`) 

  new cdk.CfnOutput(this, "Timestamp", {value: timestamp }); 
  new cdk.CfnOutput(this, "private ip", {value: `${ec2Instance.instancePrivateIp}`})
  new cdk.CfnOutput(this, "instanceId", {value: `${ec2Instance.instanceId}`})
  }
  
}
