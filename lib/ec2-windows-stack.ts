import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {App, Stack, Tags, StackProps} from 'aws-cdk-lib';
import {aws_iam as iam }from 'aws-cdk-lib';
import {aws_ec2 as ec2 }from 'aws-cdk-lib';
import {MultipartBody, UserData, WindowsVersion } from 'aws-cdk-lib/aws-ec2';
import {aws_secretsmanager  as secman} from 'aws-cdk-lib'; 
import {readFileSync} from 'fs';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import path = require('path');
var generator = require('generate-password');

interface IStackProps extends StackProps {
  solutionName: string;
  appName: string;  
  appPort: number;
  ec2KeyName: string; 
  testingLocation: string; 
  environment: string; 
  costcenter: string; 
  dtstamp: string; 
}


export class EC2WindowsStack extends Stack {
  constructor(scope: App, id: string, props: IStackProps) {
    super(scope, id, props);

  //hardcoded credentails intended for TESTING ENVIRONMENTS only 
  const user = "demouser"
  //const password = "SuperSecretPwd11!!"
  var password = generator.generate({
    length: 16,
    numbers: true,
    exclude: "@£$%&*()#€"
  });

  //Target Default VPC
 // const vpc = ec2.Vpc.fromLookup(this, 'import default vpc', { isDefault: true });

    //import the VPC 
    const vpcId = ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/vpcId`)
    const vpc = ec2.Vpc.fromLookup(this, `${props.solutionName}-import-vpc`, { vpcId });

  //Create Instance SecurityGroup -
  const serverSG = new ec2.SecurityGroup(this, 'create security group for instance', {vpc});
  // NO INBOUND TRAFFIC ALLOWED    
  // uncomment to allow port web traffic ingress into web server traffic 
  // serverSG.addIngressRule( ec2.Peer.anyIpv4(), ec2.Port.tcp(3389), 'allow RDP traffic from anywhere')

  // uncomment to allow RDP Traffic ingress over the internet into server traffic
   //serverSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow HTTP traffic from anywhere' ); 



  //Create ec2 instance role 
  const Instancerole =  new iam.Role(this, 'ec2 instance role', 
    {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: "EC2_SSM_Instance_Role",
      description: 'SSM IAM role in AWS CDK',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        )
      ],
    }
  )

  ///*  Add inline policy to role created above */
  Instancerole.addToPolicy(
    new iam.PolicyStatement(
    {
      effect: iam.Effect.ALLOW,
      actions: ["logs:DescribeLogGroups", "logs:CreateLogGroup" ], 
      resources : ["*"]
    }));
    Instancerole.addToPolicy(
    new iam.PolicyStatement(
    {
        effect: iam.Effect.ALLOW,
        actions: ["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents" ], 
        //resources : ["arn:aws:logs:*:*:log-group:/aws/systemManager/SessionManagerLogs" ] //specify write only to specific logGroup
        resources : ["*"]
    }));
   // const bucketName = ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/s3/name`)
  // const assetBucket = s3.Bucket.fromBucketName(this, "getAssetBuck", bucketName)
  // const assetBucket = s3.Bucket.fromBucketName(this, "MyBucket", ssm.StringParameter.valueForStringParameter(this, `/${props.solutionName}/${props.environment}/s3/name`))
   
   Instancerole.addToPolicy(
      new iam.PolicyStatement(
      {
          effect: iam.Effect.ALLOW,
          actions: ["s3:*" ], 
         // resources : [assetBucket.bucketArn ] //specify write only to specific logGroup
          resources : ["*"]
      }));
  


  const asset = new Asset(this, 'Asset', {
    //path: './configure.sh'
    //path: "./assets/diskBenchmark/win_app_benchmark_4000f2.exe",
    path: path.join(__dirname, "../assets/diskBenchmark/win_app_benchmark_4000f2.exe"),
  });
  asset.grantRead(Instancerole);


  //Configure UserData Scripts to create demouser and install base webserver
  const multipartUserData = new ec2.MultipartUserData
  const commandsUserData = ec2.UserData.forWindows(); 
  multipartUserData.addUserDataPart(commandsUserData, MultipartBody.SHELL_SCRIPT);
  commandsUserData.addCommands(`$user="${user}"`);
  commandsUserData.addCommands(`$secureString = ConvertTo-SecureString "${password}" -AsPlainText -Force`);
  commandsUserData.addCommands("new-localuser $user -password  $secureString");
  commandsUserData.addCommands("Add-LocalGroupMember -Group \"Administrators\" -Member $user");
  commandsUserData.addCommands("Get-LocalUser $user | select *");
  commandsUserData.addCommands("iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))");
  commandsUserData.addCommands("choco install firefox -y"); 
  commandsUserData.addCommands("choco install git -y");
  commandsUserData.addCommands("$env:Path += ';C:\\Program Files\\Git\\cmd' ");
  commandsUserData.addCommands("cd c:\\");
  commandsUserData.addCommands("mkdir src");
  commandsUserData.addCommands("cd src");
   //dowload github artifacts
  commandsUserData.addCommands("git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git");
  commandsUserData.addCommands("git clone https://github.com/vaughngit/aws-cdk.git");
  //commandsUserData.addS3DownloadCommand({bucket: assetBucket, bucketKey: "software/benchmark/win_app_benchmark_4000f2.exe" })
  commandsUserData.addS3DownloadCommand({bucket: asset.bucket, bucketKey: asset.s3ObjectKey })
  commandsUserData.addCommands("cd aws-cdk");

  // uncomment to install IIS webserver 
  // commandsUserData.addCommands("Install-WindowsFeature -name Web-Server -IncludeManagementTools");

  const rootVolume: ec2.BlockDevice = {
    deviceName: '/dev/sda1', // Use the root device name from Step 1
    //volume: ec2.BlockDeviceVolume.ebs(50), // Override the volume size in Gibibytes (GiB)
    volume: ec2.BlockDeviceVolume.ebs(500)
  };


  //Create EC2 Instance: 
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role: Instancerole,
      securityGroup: serverSG,
      keyName: props.ec2KeyName, 
      blockDevices: [rootVolume],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
      },
      machineImage: new ec2.WindowsImage(WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3A,
        ec2.InstanceSize.MEDIUM,
      ),
     // instanceName: "TestWindowInstance-js-cdk",
      userData: commandsUserData
    });


    Tags.of(this).add("Name", props.appName)
    Tags.of(this).add("appName", props.appName)
    Tags.of(this).add("solution", props.solutionName)
    Tags.of(this).add("environment", props.environment)
    Tags.of(this).add("costcenter", props.costcenter)

    new cdk.CfnOutput(this, 'username', {value:user })
    new cdk.CfnOutput(this, 'password', {value: password}) 
    new cdk.CfnOutput(this, 'InstanceId', {value: ec2Instance.instanceId})
    new cdk.CfnOutput(this, 'InstancePrivateDnsName', {value: ec2Instance.instancePrivateDnsName})

  }
  
}
