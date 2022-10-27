import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Stack, StackProps, Tags, custom_resources as cr, CustomResource, CfnOutput, Duration, } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {aws_ec2 as ec2, aws_logs as logs, aws_iam as iam} from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {aws_ecs as ecs } from 'aws-cdk-lib'
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from 'path';

import { aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import { escape } from 'querystring';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling'


export interface IinfrastructureStackProps extends StackProps{
  environment: string; 
  solutionName: string; 
  serviceName: string; 
  costcenter: string; 
}


export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: IinfrastructureStackProps) {
    super(scope, id, props);


    const natGatewayProvider = ec2.NatProvider.instance({
      instanceType: new ec2.InstanceType('t3.nano')
    })


  // Create new VPC
  const vpc = new ec2.Vpc(this, `createNewVPC`, { 
    vpcName: props.solutionName,
    natGatewayProvider: natGatewayProvider,
    maxAzs: 2,
    cidr: "172.16.0.0/16",
    natGateways: 2,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    subnetConfiguration: [
      {
        name: `${props.solutionName}-ingress-1`,
        cidrMask: 24,
        mapPublicIpOnLaunch: true,
        subnetType: ec2.SubnetType.PUBLIC
      },
      {
        name: `${props.solutionName}-ingress-2`,
        cidrMask: 24,
        mapPublicIpOnLaunch: true,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      {
        name: `${props.solutionName}-selfmanaged-1`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      },
      {
        name: `${props.solutionName}-selfmanaged-2`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
      },
      {
        name: `${props.solutionName}-awsmanaged-1`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      {
        name: `${props.solutionName}-awsmanaged-2`,
        cidrMask: 24,
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      }
    ]
  });

  // VPCID SSM Param
  new ssm.StringParameter(this, 'vpcid ssm param', {
    parameterName: `/${props.solutionName}/${props.environment}/vpcId`,
    stringValue: vpc.vpcId,
    description: `param for ${props.solutionName} vpcid`,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.INTELLIGENT_TIERING,
    allowedPattern: '.*',
  });

    //EC2 Security Group 
    const ec2SG = new ec2.SecurityGroup(this, `EC2-SG`, { 
        vpc,
        description: `${props.solutionName} EC2 ${props.environment} SecurityGroup`,
        securityGroupName: `${props.solutionName}-EC2-${props.environment}-SG`,  
    });
    ec2SG.addIngressRule(ec2SG,ec2.Port.allTraffic(), 'allow all east/west traffic inside security group');

    // createSsmParam.standardStringParameter(ecsSgSsmParam, ecsSG.securityGroupId); 
    new ssm.StringParameter(this, 'ec2 sg ssm param', {
        parameterName: `/${props.solutionName}/${props.environment}/ec2SgId`,
        stringValue: ec2SG.securityGroupId,
        description: `param for ${props.solutionName} ec2 security group id`,
        type: ssm.ParameterType.STRING,
        tier: ssm.ParameterTier.INTELLIGENT_TIERING,
        allowedPattern: '.*',
    });


    // S3 Gateway Endpoint 
    const s3GatewayEndpoint = vpc.addGatewayEndpoint('s3GatewayEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        // Add only to ISOLATED subnets
        subnets: [
          { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
          { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
        ]
    });

    // DynamoDb Gateway endpoint
    const dynamoDbEndpoint = vpc.addGatewayEndpoint('DynamoDbEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        // Add only to ISOLATED subnets
        subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
        ]
    });

    // Add an interface endpoint
    vpc.addInterfaceEndpoint('SystemsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SSM,
        // Uncomment the following to allow more fine-grained control over
        // who can access the endpoint via the '.connections' object.
        // open: false
        lookupSupportedAzs: true,
        open: true,
        securityGroups:[ec2SG]
    });
    

    // CloudWatch interface endpoint
    vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // CW Events interface endpoint
    vpc.addInterfaceEndpoint('CloudWatch_Events_Endpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // CW Logs interface endpoint
    vpc.addInterfaceEndpoint('CloudWatch_Logs_Endpoint', {
    service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
    // Uncomment the following to allow more fine-grained control over
    // who can access the endpoint via the '.connections' object.
    // open: false
    lookupSupportedAzs: true,
    open: true,
    securityGroups: [ec2SG]
    });

    // ECR interface endpoint
    vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
      securityGroups: [ec2SG],
      lookupSupportedAzs: true,
      open: true
    });

    // EFS interface endpoint
    vpc.addInterfaceEndpoint('EFSEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
      // Uncomment the following to allow more fine-grained control over
      // who can access the endpoint via the '.connections' object.
      // open: false
      lookupSupportedAzs: true,
      open: true,
    });
/* 
    new ec2.InterfaceVpcEndpoint(this, "efs endpoint", { 
      vpc,
      service: new ec2.InterfaceVpcEndpointService(`com.amazonaws.${this.region}.elasticfilesystem`, 2049),
      securityGroups: [ecsSG],
      open: true ,
      lookupSupportedAzs: true 
    }) 
*/
 
  // Configure Cloudwatch Log group: 
  const logGroup = new logs.LogGroup(
    this, `create solution Log group`,
    {
      logGroupName: `/${props.solutionName}/${props.environment}/`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    }
  );

  //CW Log group SSM Param 
  new ssm.StringParameter(this, 'log group name ssm param', {
    parameterName: `/${props.solutionName}/${props.environment}/logGroupName`,
    stringValue: logGroup.logGroupName,
    description: `param for ${props.solutionName} log group name`,
    type: ssm.ParameterType.STRING,
    tier: ssm.ParameterTier.INTELLIGENT_TIERING,
    allowedPattern: '.*',
  });

  /* 

  const vpcFlowlogsRole = new iam.Role(this, `${props.solutionName}-role-for-vpcflowlogs`, {
    assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com')
  });
  

  new ec2.FlowLog(this, 'FlowLog', {
    flowLogName: `${props.solutionName}-${props.environment}-vpclogs`,
    resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
    trafficType: ec2.FlowLogTrafficType.ALL,
    destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, vpcFlowlogsRole)
  }); */



  const sdk3layer = new lambda.LayerVersion(this, 'HelperLayer', {
    code: lambda.Code.fromAsset('assets/sourceCode/lambda-layer/aws-sdk-3-layer'),
    description: 'AWS JS SDK v3',
    compatibleRuntimes: [lambda.Runtime.NODEJS_12_X,lambda.Runtime.NODEJS_14_X],
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });


  const crLambda = new NodejsFunction(this, "customResourceFunction", {
    functionName: `${props.serviceName}-update-infrastructure-${props.environment}`,
    entry: path.join(__dirname, `/../assets/sourceCode/customResourceLambda/index.ts`),
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: 'handler',
    timeout: Duration.minutes(10),
    layers: [sdk3layer],
    environment: {
      REGION: this.region
    },
    bundling: {
      minify: true,
      externalModules: ['aws-sdk','@aws-sdk/client-iam','@aws-sdk/client-ec2'],
    },
  });

  const provider = new cr.Provider(this, "Provider", {
    onEventHandler: crLambda,
  });

  provider.onEventHandler.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ["iam:*", "ec2:*"],
      effect: iam.Effect.ALLOW,
      resources: [ `*`],
    })
  );

// add tag to interface gateways and manage nat gateway: 
  new CustomResource(this, "CustomResource", {
    serviceToken: provider.serviceToken,
    properties: {
      natGateways: natGatewayProvider.configuredGateways,
      vpcId: vpc.vpcId,
      tags:[  {Key: "service", Value: props.serviceName},{Key: "environment", Value: props.environment}, {Key: "solution", Value: props.solutionName},{Key: "costcenter", Value: props.costcenter}    ]
      
    },
  });
     
  Tags.of(this).add("service", `${props.serviceName}`,{
    includeResourceTypes: []
  })
  Tags.of(this).add("environment", props.environment)
  Tags.of(this).add("solution", props.solutionName)
  Tags.of(this).add("costcenter", props.costcenter)
  Tags.of(this).add("ShutdownPolicy", "NoShutdown")


  new CfnOutput(this, 'VPCId', { value: vpc.vpcId, exportName: `${props.solutionName}:${props.environment}:VPCID:${this.region}`} );

 new CfnOutput(this, 'NatGateways', { value: natGatewayProvider.configuredGateways.toString()} );

  new CfnOutput(this, 'VPCCIDR', { value: vpc.vpcCidrBlock, exportName: `${props.solutionName}:VpcCIDR`} );

  new CfnOutput(this, 'VPCPrivateSubnet1', { value: vpc.privateSubnets[0].subnetId, exportName: `${props.solutionName}:PrivateSubnet1`} );
  
  new CfnOutput(this, 'VPCPrivateSubnet2', { value: vpc.privateSubnets[1].subnetId, exportName: `${props.solutionName}:PrivateSubnet2`} );

  new CfnOutput(this, 'VPCPrivateSubnet1-AZ', { value: vpc.privateSubnets[0].availabilityZone} );
  
  new CfnOutput(this, 'VPCPrivateSubnet2-AZ', { value: vpc.privateSubnets[1].availabilityZone });

  new CfnOutput(this, 'ContainerSecurityGroup', { value: ec2SG.securityGroupId, exportName: `${props.solutionName}:EC2SecurityGroup`} );

  new CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
 

  }
}