"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfrastructureStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_cdk_lib_3 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const path = require("path");
class InfrastructureStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const natGatewayProvider = aws_cdk_lib_2.aws_ec2.NatProvider.instance({
            instanceType: new aws_cdk_lib_2.aws_ec2.InstanceType('t3.nano')
        });
        // Create new VPC
        const vpc = new aws_cdk_lib_2.aws_ec2.Vpc(this, `createNewVPC`, {
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
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PUBLIC
                },
                {
                    name: `${props.solutionName}-ingress-2`,
                    cidrMask: 24,
                    mapPublicIpOnLaunch: true,
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PUBLIC,
                },
                {
                    name: `${props.solutionName}-selfmanaged-1`,
                    cidrMask: 24,
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_WITH_NAT
                },
                {
                    name: `${props.solutionName}-selfmanaged-2`,
                    cidrMask: 24,
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_WITH_NAT
                },
                {
                    name: `${props.solutionName}-awsmanaged-1`,
                    cidrMask: 24,
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_ISOLATED
                },
                {
                    name: `${props.solutionName}-awsmanaged-2`,
                    cidrMask: 24,
                    subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_ISOLATED
                }
            ]
        });
        // VPCID SSM Param
        new aws_cdk_lib_3.aws_ssm.StringParameter(this, 'vpcid ssm param', {
            parameterName: `/${props.solutionName}/${props.environment}/vpcId`,
            stringValue: vpc.vpcId,
            description: `param for ${props.solutionName} vpcid`,
            type: aws_cdk_lib_3.aws_ssm.ParameterType.STRING,
            tier: aws_cdk_lib_3.aws_ssm.ParameterTier.INTELLIGENT_TIERING,
            allowedPattern: '.*',
        });
        //EC2 Security Group 
        const ec2SG = new aws_cdk_lib_2.aws_ec2.SecurityGroup(this, `EC2-SG`, {
            vpc,
            description: `${props.solutionName} EC2 ${props.environment} SecurityGroup`,
            securityGroupName: `${props.solutionName}-EC2-${props.environment}-SG`,
        });
        ec2SG.addIngressRule(ec2SG, aws_cdk_lib_2.aws_ec2.Port.allTraffic(), 'allow all east/west traffic inside security group');
        // createSsmParam.standardStringParameter(ecsSgSsmParam, ecsSG.securityGroupId); 
        new aws_cdk_lib_3.aws_ssm.StringParameter(this, 'ec2 sg ssm param', {
            parameterName: `/${props.solutionName}/${props.environment}/ec2SgId`,
            stringValue: ec2SG.securityGroupId,
            description: `param for ${props.solutionName} ec2 security group id`,
            type: aws_cdk_lib_3.aws_ssm.ParameterType.STRING,
            tier: aws_cdk_lib_3.aws_ssm.ParameterTier.INTELLIGENT_TIERING,
            allowedPattern: '.*',
        });
        // S3 Gateway Endpoint 
        const s3GatewayEndpoint = vpc.addGatewayEndpoint('s3GatewayEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.GatewayVpcEndpointAwsService.S3,
            // Add only to ISOLATED subnets
            subnets: [
                { subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_ISOLATED },
                { subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_WITH_NAT }
            ]
        });
        // DynamoDb Gateway endpoint
        const dynamoDbEndpoint = vpc.addGatewayEndpoint('DynamoDbEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            // Add only to ISOLATED subnets
            subnets: [
                { subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_ISOLATED },
                { subnetType: aws_cdk_lib_2.aws_ec2.SubnetType.PRIVATE_WITH_NAT }
            ]
        });
        // Add an interface endpoint
        vpc.addInterfaceEndpoint('SystemsManagerEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.SSM,
            // Uncomment the following to allow more fine-grained control over
            // who can access the endpoint via the '.connections' object.
            // open: false
            lookupSupportedAzs: true,
            open: true,
            securityGroups: [ec2SG]
        });
        // CloudWatch interface endpoint
        vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
            // Uncomment the following to allow more fine-grained control over
            // who can access the endpoint via the '.connections' object.
            // open: false
            lookupSupportedAzs: true,
            open: true,
            securityGroups: [ec2SG]
        });
        // CW Events interface endpoint
        vpc.addInterfaceEndpoint('CloudWatch_Events_Endpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS,
            // Uncomment the following to allow more fine-grained control over
            // who can access the endpoint via the '.connections' object.
            // open: false
            lookupSupportedAzs: true,
            open: true,
            securityGroups: [ec2SG]
        });
        // CW Logs interface endpoint
        vpc.addInterfaceEndpoint('CloudWatch_Logs_Endpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            // Uncomment the following to allow more fine-grained control over
            // who can access the endpoint via the '.connections' object.
            // open: false
            lookupSupportedAzs: true,
            open: true,
            securityGroups: [ec2SG]
        });
        // ECR interface endpoint
        vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            // Uncomment the following to allow more fine-grained control over
            // who can access the endpoint via the '.connections' object.
            // open: false
            securityGroups: [ec2SG],
            lookupSupportedAzs: true,
            open: true
        });
        // EFS interface endpoint
        vpc.addInterfaceEndpoint('EFSEndpoint', {
            service: aws_cdk_lib_2.aws_ec2.InterfaceVpcEndpointAwsService.ELASTIC_FILESYSTEM,
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
        const logGroup = new aws_cdk_lib_2.aws_logs.LogGroup(this, `create solution Log group`, {
            logGroupName: `/${props.solutionName}/${props.environment}/`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: aws_cdk_lib_2.aws_logs.RetentionDays.ONE_MONTH,
        });
        //CW Log group SSM Param 
        new aws_cdk_lib_3.aws_ssm.StringParameter(this, 'log group name ssm param', {
            parameterName: `/${props.solutionName}/${props.environment}/logGroupName`,
            stringValue: logGroup.logGroupName,
            description: `param for ${props.solutionName} log group name`,
            type: aws_cdk_lib_3.aws_ssm.ParameterType.STRING,
            tier: aws_cdk_lib_3.aws_ssm.ParameterTier.INTELLIGENT_TIERING,
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
            compatibleRuntimes: [lambda.Runtime.NODEJS_12_X, lambda.Runtime.NODEJS_14_X],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const crLambda = new aws_lambda_nodejs_1.NodejsFunction(this, "customResourceFunction", {
            functionName: `${props.serviceName}-update-infrastructure-${props.environment}`,
            entry: path.join(__dirname, `/../assets/sourceCode/customResourceLambda/index.ts`),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            timeout: aws_cdk_lib_1.Duration.minutes(10),
            layers: [sdk3layer],
            environment: {
                REGION: this.region
            },
            bundling: {
                minify: true,
                externalModules: ['aws-sdk', '@aws-sdk/client-iam', '@aws-sdk/client-ec2'],
            },
        });
        const provider = new aws_cdk_lib_1.custom_resources.Provider(this, "Provider", {
            onEventHandler: crLambda,
        });
        provider.onEventHandler.addToRolePolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            actions: ["iam:*", "ec2:*"],
            effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
            resources: [`*`],
        }));
        // add tag to interface gateways and manage nat gateway: 
        new aws_cdk_lib_1.CustomResource(this, "CustomResource", {
            serviceToken: provider.serviceToken,
            properties: {
                natGateways: natGatewayProvider.configuredGateways,
                vpcId: vpc.vpcId,
                tags: [{ Key: "service", Value: props.serviceName }, { Key: "environment", Value: props.environment }, { Key: "solution", Value: props.solutionName }, { Key: "costcenter", Value: props.costcenter }]
            },
        });
        aws_cdk_lib_1.Tags.of(this).add("service", `${props.serviceName}`, {
            includeResourceTypes: []
        });
        aws_cdk_lib_1.Tags.of(this).add("environment", props.environment);
        aws_cdk_lib_1.Tags.of(this).add("solution", props.solutionName);
        aws_cdk_lib_1.Tags.of(this).add("costcenter", props.costcenter);
        aws_cdk_lib_1.Tags.of(this).add("ShutdownPolicy", "NoShutdown");
        new aws_cdk_lib_1.CfnOutput(this, 'VPCId', { value: vpc.vpcId, exportName: `${props.solutionName}:${props.environment}:VPCID:${this.region}` });
        new aws_cdk_lib_1.CfnOutput(this, 'NatGateways', { value: natGatewayProvider.configuredGateways.toString() });
        new aws_cdk_lib_1.CfnOutput(this, 'VPCCIDR', { value: vpc.vpcCidrBlock, exportName: `${props.solutionName}:VpcCIDR` });
        new aws_cdk_lib_1.CfnOutput(this, 'VPCPrivateSubnet1', { value: vpc.privateSubnets[0].subnetId, exportName: `${props.solutionName}:PrivateSubnet1` });
        new aws_cdk_lib_1.CfnOutput(this, 'VPCPrivateSubnet2', { value: vpc.privateSubnets[1].subnetId, exportName: `${props.solutionName}:PrivateSubnet2` });
        new aws_cdk_lib_1.CfnOutput(this, 'VPCPrivateSubnet1-AZ', { value: vpc.privateSubnets[0].availabilityZone });
        new aws_cdk_lib_1.CfnOutput(this, 'VPCPrivateSubnet2-AZ', { value: vpc.privateSubnets[1].availabilityZone });
        new aws_cdk_lib_1.CfnOutput(this, 'ContainerSecurityGroup', { value: ec2SG.securityGroupId, exportName: `${props.solutionName}:EC2SecurityGroup` });
        new aws_cdk_lib_1.CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
    }
}
exports.InfrastructureStack = InfrastructureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWMyLWluZnJhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWMyLWluZnJhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyw2Q0FBbUk7QUFFbkksNkNBQTRFO0FBQzVFLGlEQUFpRDtBQUVqRCw2Q0FBMkM7QUFDM0MscUVBQStEO0FBQy9ELDZCQUE2QjtBQWU3QixNQUFhLG1CQUFvQixTQUFRLG1CQUFLO0lBQzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFHeEIsTUFBTSxrQkFBa0IsR0FBRyxxQkFBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7WUFDbEQsWUFBWSxFQUFFLElBQUkscUJBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1NBQzlDLENBQUMsQ0FBQTtRQUdKLGlCQUFpQjtRQUNqQixNQUFNLEdBQUcsR0FBRyxJQUFJLHFCQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDNUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxZQUFZO1lBQzNCLGtCQUFrQixFQUFFLGtCQUFrQjtZQUN0QyxNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRSxlQUFlO1lBQ3JCLFdBQVcsRUFBRSxDQUFDO1lBQ2Qsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxZQUFZO29CQUN2QyxRQUFRLEVBQUUsRUFBRTtvQkFDWixtQkFBbUIsRUFBRSxJQUFJO29CQUN6QixVQUFVLEVBQUUscUJBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTtpQkFDbEM7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksWUFBWTtvQkFD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ZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5LCBTdGFjaywgU3RhY2tQcm9wcywgVGFncywgY3VzdG9tX3Jlc291cmNlcyBhcyBjciwgQ3VzdG9tUmVzb3VyY2UsIENmbk91dHB1dCwgRHVyYXRpb24sIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQge2F3c19lYzIgYXMgZWMyLCBhd3NfbG9ncyBhcyBsb2dzLCBhd3NfaWFtIGFzIGlhbX0gZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQge2F3c19lY3MgYXMgZWNzIH0gZnJvbSAnYXdzLWNkay1saWInXG5pbXBvcnQge2F3c19zc20gYXMgc3NtIH0gZnJvbSAnYXdzLWNkay1saWInIFxuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmltcG9ydCB7IGF3c19lbGFzdGljbG9hZGJhbGFuY2luZ3YyIGFzIGVsYnYyIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgZXNjYXBlIH0gZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0ICogYXMgYXV0b3NjYWxpbmcgZnJvbSAnYXdzLWNkay1saWIvYXdzLWF1dG9zY2FsaW5nJ1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgSWluZnJhc3RydWN0dXJlU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHN7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7IFxuICBzb2x1dGlvbk5hbWU6IHN0cmluZzsgXG4gIHNlcnZpY2VOYW1lOiBzdHJpbmc7IFxuICBjb3N0Y2VudGVyOiBzdHJpbmc7IFxufVxuXG5cbmV4cG9ydCBjbGFzcyBJbmZyYXN0cnVjdHVyZVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogSWluZnJhc3RydWN0dXJlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG5cbiAgICBjb25zdCBuYXRHYXRld2F5UHJvdmlkZXIgPSBlYzIuTmF0UHJvdmlkZXIuaW5zdGFuY2Uoe1xuICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZSgndDMubmFubycpXG4gICAgfSlcblxuXG4gIC8vIENyZWF0ZSBuZXcgVlBDXG4gIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsIGBjcmVhdGVOZXdWUENgLCB7IFxuICAgIHZwY05hbWU6IHByb3BzLnNvbHV0aW9uTmFtZSxcbiAgICBuYXRHYXRld2F5UHJvdmlkZXI6IG5hdEdhdGV3YXlQcm92aWRlcixcbiAgICBtYXhBenM6IDIsXG4gICAgY2lkcjogXCIxNzIuMTYuMC4wLzE2XCIsXG4gICAgbmF0R2F0ZXdheXM6IDIsXG4gICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxuICAgIGVuYWJsZURuc1N1cHBvcnQ6IHRydWUsXG4gICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAge1xuICAgICAgICBuYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LWluZ3Jlc3MtMWAsXG4gICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgbWFwUHVibGljSXBPbkxhdW5jaDogdHJ1ZSxcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LWluZ3Jlc3MtMmAsXG4gICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgbWFwUHVibGljSXBPbkxhdW5jaDogdHJ1ZSxcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS1zZWxmbWFuYWdlZC0xYCxcbiAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFUXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LXNlbGZtYW5hZ2VkLTJgLFxuICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVRcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tYXdzbWFuYWdlZC0xYCxcbiAgICAgICAgY2lkck1hc2s6IDI0LFxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LWF3c21hbmFnZWQtMmAsXG4gICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRFxuICAgICAgfVxuICAgIF1cbiAgfSk7XG5cbiAgLy8gVlBDSUQgU1NNIFBhcmFtXG4gIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICd2cGNpZCBzc20gcGFyYW0nLCB7XG4gICAgcGFyYW1ldGVyTmFtZTogYC8ke3Byb3BzLnNvbHV0aW9uTmFtZX0vJHtwcm9wcy5lbnZpcm9ubWVudH0vdnBjSWRgLFxuICAgIHN0cmluZ1ZhbHVlOiB2cGMudnBjSWQsXG4gICAgZGVzY3JpcHRpb246IGBwYXJhbSBmb3IgJHtwcm9wcy5zb2x1dGlvbk5hbWV9IHZwY2lkYCxcbiAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuSU5URUxMSUdFTlRfVElFUklORyxcbiAgICBhbGxvd2VkUGF0dGVybjogJy4qJyxcbiAgfSk7XG5cbiAgICAvL0VDMiBTZWN1cml0eSBHcm91cCBcbiAgICBjb25zdCBlYzJTRyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCBgRUMyLVNHYCwgeyBcbiAgICAgICAgdnBjLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7cHJvcHMuc29sdXRpb25OYW1lfSBFQzIgJHtwcm9wcy5lbnZpcm9ubWVudH0gU2VjdXJpdHlHcm91cGAsXG4gICAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LUVDMi0ke3Byb3BzLmVudmlyb25tZW50fS1TR2AsICBcbiAgICB9KTtcbiAgICBlYzJTRy5hZGRJbmdyZXNzUnVsZShlYzJTRyxlYzIuUG9ydC5hbGxUcmFmZmljKCksICdhbGxvdyBhbGwgZWFzdC93ZXN0IHRyYWZmaWMgaW5zaWRlIHNlY3VyaXR5IGdyb3VwJyk7XG5cbiAgICAvLyBjcmVhdGVTc21QYXJhbS5zdGFuZGFyZFN0cmluZ1BhcmFtZXRlcihlY3NTZ1NzbVBhcmFtLCBlY3NTRy5zZWN1cml0eUdyb3VwSWQpOyBcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnZWMyIHNnIHNzbSBwYXJhbScsIHtcbiAgICAgICAgcGFyYW1ldGVyTmFtZTogYC8ke3Byb3BzLnNvbHV0aW9uTmFtZX0vJHtwcm9wcy5lbnZpcm9ubWVudH0vZWMyU2dJZGAsXG4gICAgICAgIHN0cmluZ1ZhbHVlOiBlYzJTRy5zZWN1cml0eUdyb3VwSWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgcGFyYW0gZm9yICR7cHJvcHMuc29sdXRpb25OYW1lfSBlYzIgc2VjdXJpdHkgZ3JvdXAgaWRgLFxuICAgICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLklOVEVMTElHRU5UX1RJRVJJTkcsXG4gICAgICAgIGFsbG93ZWRQYXR0ZXJuOiAnLionLFxuICAgIH0pO1xuXG5cbiAgICAvLyBTMyBHYXRld2F5IEVuZHBvaW50IFxuICAgIGNvbnN0IHMzR2F0ZXdheUVuZHBvaW50ID0gdnBjLmFkZEdhdGV3YXlFbmRwb2ludCgnczNHYXRld2F5RW5kcG9pbnQnLCB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlMzLFxuICAgICAgICAvLyBBZGQgb25seSB0byBJU09MQVRFRCBzdWJuZXRzXG4gICAgICAgIHN1Ym5ldHM6IFtcbiAgICAgICAgICB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQgfSxcbiAgICAgICAgICB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQgfVxuICAgICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EYiBHYXRld2F5IGVuZHBvaW50XG4gICAgY29uc3QgZHluYW1vRGJFbmRwb2ludCA9IHZwYy5hZGRHYXRld2F5RW5kcG9pbnQoJ0R5bmFtb0RiRW5kcG9pbnQnLCB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkRZTkFNT0RCLFxuICAgICAgICAvLyBBZGQgb25seSB0byBJU09MQVRFRCBzdWJuZXRzXG4gICAgICAgIHN1Ym5ldHM6IFtcbiAgICAgICAgeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEIH0sXG4gICAgICAgIHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX05BVCB9XG4gICAgICAgIF1cbiAgICB9KTtcblxuICAgIC8vIEFkZCBhbiBpbnRlcmZhY2UgZW5kcG9pbnRcbiAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ1N5c3RlbXNNYW5hZ2VyRW5kcG9pbnQnLCB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU1NNLFxuICAgICAgICAvLyBVbmNvbW1lbnQgdGhlIGZvbGxvd2luZyB0byBhbGxvdyBtb3JlIGZpbmUtZ3JhaW5lZCBjb250cm9sIG92ZXJcbiAgICAgICAgLy8gd2hvIGNhbiBhY2Nlc3MgdGhlIGVuZHBvaW50IHZpYSB0aGUgJy5jb25uZWN0aW9ucycgb2JqZWN0LlxuICAgICAgICAvLyBvcGVuOiBmYWxzZVxuICAgICAgICBsb29rdXBTdXBwb3J0ZWRBenM6IHRydWUsXG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOltlYzJTR11cbiAgICB9KTtcbiAgICBcblxuICAgIC8vIENsb3VkV2F0Y2ggaW50ZXJmYWNlIGVuZHBvaW50XG4gICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdDbG91ZFdhdGNoRW5kcG9pbnQnLCB7XG4gICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5DTE9VRFdBVENILFxuICAgIC8vIFVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIGFsbG93IG1vcmUgZmluZS1ncmFpbmVkIGNvbnRyb2wgb3ZlclxuICAgIC8vIHdobyBjYW4gYWNjZXNzIHRoZSBlbmRwb2ludCB2aWEgdGhlICcuY29ubmVjdGlvbnMnIG9iamVjdC5cbiAgICAvLyBvcGVuOiBmYWxzZVxuICAgIGxvb2t1cFN1cHBvcnRlZEF6czogdHJ1ZSxcbiAgICBvcGVuOiB0cnVlLFxuICAgIHNlY3VyaXR5R3JvdXBzOiBbZWMyU0ddXG4gICAgfSk7XG5cbiAgICAvLyBDVyBFdmVudHMgaW50ZXJmYWNlIGVuZHBvaW50XG4gICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdDbG91ZFdhdGNoX0V2ZW50c19FbmRwb2ludCcsIHtcbiAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkNMT1VEV0FUQ0hfRVZFTlRTLFxuICAgIC8vIFVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIGFsbG93IG1vcmUgZmluZS1ncmFpbmVkIGNvbnRyb2wgb3ZlclxuICAgIC8vIHdobyBjYW4gYWNjZXNzIHRoZSBlbmRwb2ludCB2aWEgdGhlICcuY29ubmVjdGlvbnMnIG9iamVjdC5cbiAgICAvLyBvcGVuOiBmYWxzZVxuICAgIGxvb2t1cFN1cHBvcnRlZEF6czogdHJ1ZSxcbiAgICBvcGVuOiB0cnVlLFxuICAgIHNlY3VyaXR5R3JvdXBzOiBbZWMyU0ddXG4gICAgfSk7XG5cbiAgICAvLyBDVyBMb2dzIGludGVyZmFjZSBlbmRwb2ludFxuICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludCgnQ2xvdWRXYXRjaF9Mb2dzX0VuZHBvaW50Jywge1xuICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuQ0xPVURXQVRDSF9MT0dTLFxuICAgIC8vIFVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIGFsbG93IG1vcmUgZmluZS1ncmFpbmVkIGNvbnRyb2wgb3ZlclxuICAgIC8vIHdobyBjYW4gYWNjZXNzIHRoZSBlbmRwb2ludCB2aWEgdGhlICcuY29ubmVjdGlvbnMnIG9iamVjdC5cbiAgICAvLyBvcGVuOiBmYWxzZVxuICAgIGxvb2t1cFN1cHBvcnRlZEF6czogdHJ1ZSxcbiAgICBvcGVuOiB0cnVlLFxuICAgIHNlY3VyaXR5R3JvdXBzOiBbZWMyU0ddXG4gICAgfSk7XG5cbiAgICAvLyBFQ1IgaW50ZXJmYWNlIGVuZHBvaW50XG4gICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdFY3JEb2NrZXJFbmRwb2ludCcsIHtcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNSX0RPQ0tFUixcbiAgICAgIC8vIFVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIGFsbG93IG1vcmUgZmluZS1ncmFpbmVkIGNvbnRyb2wgb3ZlclxuICAgICAgLy8gd2hvIGNhbiBhY2Nlc3MgdGhlIGVuZHBvaW50IHZpYSB0aGUgJy5jb25uZWN0aW9ucycgb2JqZWN0LlxuICAgICAgLy8gb3BlbjogZmFsc2VcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbZWMyU0ddLFxuICAgICAgbG9va3VwU3VwcG9ydGVkQXpzOiB0cnVlLFxuICAgICAgb3BlbjogdHJ1ZVxuICAgIH0pO1xuXG4gICAgLy8gRUZTIGludGVyZmFjZSBlbmRwb2ludFxuICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludCgnRUZTRW5kcG9pbnQnLCB7XG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkVMQVNUSUNfRklMRVNZU1RFTSxcbiAgICAgIC8vIFVuY29tbWVudCB0aGUgZm9sbG93aW5nIHRvIGFsbG93IG1vcmUgZmluZS1ncmFpbmVkIGNvbnRyb2wgb3ZlclxuICAgICAgLy8gd2hvIGNhbiBhY2Nlc3MgdGhlIGVuZHBvaW50IHZpYSB0aGUgJy5jb25uZWN0aW9ucycgb2JqZWN0LlxuICAgICAgLy8gb3BlbjogZmFsc2VcbiAgICAgIGxvb2t1cFN1cHBvcnRlZEF6czogdHJ1ZSxcbiAgICAgIG9wZW46IHRydWUsXG4gICAgfSk7XG4vKiBcbiAgICBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50KHRoaXMsIFwiZWZzIGVuZHBvaW50XCIsIHsgXG4gICAgICB2cGMsXG4gICAgICBzZXJ2aWNlOiBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50U2VydmljZShgY29tLmFtYXpvbmF3cy4ke3RoaXMucmVnaW9ufS5lbGFzdGljZmlsZXN5c3RlbWAsIDIwNDkpLFxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtlY3NTR10sXG4gICAgICBvcGVuOiB0cnVlICxcbiAgICAgIGxvb2t1cFN1cHBvcnRlZEF6czogdHJ1ZSBcbiAgICB9KSBcbiovXG4gXG4gIC8vIENvbmZpZ3VyZSBDbG91ZHdhdGNoIExvZyBncm91cDogXG4gIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAoXG4gICAgdGhpcywgYGNyZWF0ZSBzb2x1dGlvbiBMb2cgZ3JvdXBgLFxuICAgIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC8ke3Byb3BzLnNvbHV0aW9uTmFtZX0vJHtwcm9wcy5lbnZpcm9ubWVudH0vYCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXG4gICAgfVxuICApO1xuXG4gIC8vQ1cgTG9nIGdyb3VwIFNTTSBQYXJhbSBcbiAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ2xvZyBncm91cCBuYW1lIHNzbSBwYXJhbScsIHtcbiAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuc29sdXRpb25OYW1lfS8ke3Byb3BzLmVudmlyb25tZW50fS9sb2dHcm91cE5hbWVgLFxuICAgIHN0cmluZ1ZhbHVlOiBsb2dHcm91cC5sb2dHcm91cE5hbWUsXG4gICAgZGVzY3JpcHRpb246IGBwYXJhbSBmb3IgJHtwcm9wcy5zb2x1dGlvbk5hbWV9IGxvZyBncm91cCBuYW1lYCxcbiAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuSU5URUxMSUdFTlRfVElFUklORyxcbiAgICBhbGxvd2VkUGF0dGVybjogJy4qJyxcbiAgfSk7XG5cbiAgLyogXG5cbiAgY29uc3QgdnBjRmxvd2xvZ3NSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tcm9sZS1mb3ItdnBjZmxvd2xvZ3NgLCB7XG4gICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ3ZwYy1mbG93LWxvZ3MuYW1hem9uYXdzLmNvbScpXG4gIH0pO1xuICBcblxuICBuZXcgZWMyLkZsb3dMb2codGhpcywgJ0Zsb3dMb2cnLCB7XG4gICAgZmxvd0xvZ05hbWU6IGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tdnBjbG9nc2AsXG4gICAgcmVzb3VyY2VUeXBlOiBlYzIuRmxvd0xvZ1Jlc291cmNlVHlwZS5mcm9tVnBjKHZwYyksXG4gICAgdHJhZmZpY1R5cGU6IGVjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxuICAgIGRlc3RpbmF0aW9uOiBlYzIuRmxvd0xvZ0Rlc3RpbmF0aW9uLnRvQ2xvdWRXYXRjaExvZ3MobG9nR3JvdXAsIHZwY0Zsb3dsb2dzUm9sZSlcbiAgfSk7ICovXG5cblxuXG4gIGNvbnN0IHNkazNsYXllciA9IG5ldyBsYW1iZGEuTGF5ZXJWZXJzaW9uKHRoaXMsICdIZWxwZXJMYXllcicsIHtcbiAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Fzc2V0cy9zb3VyY2VDb2RlL2xhbWJkYS1sYXllci9hd3Mtc2RrLTMtbGF5ZXInKSxcbiAgICBkZXNjcmlwdGlvbjogJ0FXUyBKUyBTREsgdjMnLFxuICAgIGNvbXBhdGlibGVSdW50aW1lczogW2xhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YXSxcbiAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICB9KTtcblxuXG4gIGNvbnN0IGNyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsIFwiY3VzdG9tUmVzb3VyY2VGdW5jdGlvblwiLCB7XG4gICAgZnVuY3Rpb25OYW1lOiBgJHtwcm9wcy5zZXJ2aWNlTmFtZX0tdXBkYXRlLWluZnJhc3RydWN0dXJlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgYC8uLi9hc3NldHMvc291cmNlQ29kZS9jdXN0b21SZXNvdXJjZUxhbWJkYS9pbmRleC50c2ApLFxuICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDEwKSxcbiAgICBsYXllcnM6IFtzZGszbGF5ZXJdLFxuICAgIGVudmlyb25tZW50OiB7XG4gICAgICBSRUdJT046IHRoaXMucmVnaW9uXG4gICAgfSxcbiAgICBidW5kbGluZzoge1xuICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ2F3cy1zZGsnLCdAYXdzLXNkay9jbGllbnQtaWFtJywnQGF3cy1zZGsvY2xpZW50LWVjMiddLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsIFwiUHJvdmlkZXJcIiwge1xuICAgIG9uRXZlbnRIYW5kbGVyOiBjckxhbWJkYSxcbiAgfSk7XG5cbiAgcHJvdmlkZXIub25FdmVudEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGFjdGlvbnM6IFtcImlhbToqXCIsIFwiZWMyOipcIl0sXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICByZXNvdXJjZXM6IFsgYCpgXSxcbiAgICB9KVxuICApO1xuXG4vLyBhZGQgdGFnIHRvIGludGVyZmFjZSBnYXRld2F5cyBhbmQgbWFuYWdlIG5hdCBnYXRld2F5OiBcbiAgbmV3IEN1c3RvbVJlc291cmNlKHRoaXMsIFwiQ3VzdG9tUmVzb3VyY2VcIiwge1xuICAgIHNlcnZpY2VUb2tlbjogcHJvdmlkZXIuc2VydmljZVRva2VuLFxuICAgIHByb3BlcnRpZXM6IHtcbiAgICAgIG5hdEdhdGV3YXlzOiBuYXRHYXRld2F5UHJvdmlkZXIuY29uZmlndXJlZEdhdGV3YXlzLFxuICAgICAgdnBjSWQ6IHZwYy52cGNJZCxcbiAgICAgIHRhZ3M6WyAge0tleTogXCJzZXJ2aWNlXCIsIFZhbHVlOiBwcm9wcy5zZXJ2aWNlTmFtZX0se0tleTogXCJlbnZpcm9ubWVudFwiLCBWYWx1ZTogcHJvcHMuZW52aXJvbm1lbnR9LCB7S2V5OiBcInNvbHV0aW9uXCIsIFZhbHVlOiBwcm9wcy5zb2x1dGlvbk5hbWV9LHtLZXk6IFwiY29zdGNlbnRlclwiLCBWYWx1ZTogcHJvcHMuY29zdGNlbnRlcn0gICAgXVxuICAgICAgXG4gICAgfSxcbiAgfSk7XG4gICAgIFxuICBUYWdzLm9mKHRoaXMpLmFkZChcInNlcnZpY2VcIiwgYCR7cHJvcHMuc2VydmljZU5hbWV9YCx7XG4gICAgaW5jbHVkZVJlc291cmNlVHlwZXM6IFtdXG4gIH0pXG4gIFRhZ3Mub2YodGhpcykuYWRkKFwiZW52aXJvbm1lbnRcIiwgcHJvcHMuZW52aXJvbm1lbnQpXG4gIFRhZ3Mub2YodGhpcykuYWRkKFwic29sdXRpb25cIiwgcHJvcHMuc29sdXRpb25OYW1lKVxuICBUYWdzLm9mKHRoaXMpLmFkZChcImNvc3RjZW50ZXJcIiwgcHJvcHMuY29zdGNlbnRlcilcbiAgVGFncy5vZih0aGlzKS5hZGQoXCJTaHV0ZG93blBvbGljeVwiLCBcIk5vU2h1dGRvd25cIilcblxuXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgJ1ZQQ0lkJywgeyB2YWx1ZTogdnBjLnZwY0lkLCBleHBvcnROYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9OiR7cHJvcHMuZW52aXJvbm1lbnR9OlZQQ0lEOiR7dGhpcy5yZWdpb259YH0gKTtcblxuIG5ldyBDZm5PdXRwdXQodGhpcywgJ05hdEdhdGV3YXlzJywgeyB2YWx1ZTogbmF0R2F0ZXdheVByb3ZpZGVyLmNvbmZpZ3VyZWRHYXRld2F5cy50b1N0cmluZygpfSApO1xuXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgJ1ZQQ0NJRFInLCB7IHZhbHVlOiB2cGMudnBjQ2lkckJsb2NrLCBleHBvcnROYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9OlZwY0NJRFJgfSApO1xuXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgJ1ZQQ1ByaXZhdGVTdWJuZXQxJywgeyB2YWx1ZTogdnBjLnByaXZhdGVTdWJuZXRzWzBdLnN1Ym5ldElkLCBleHBvcnROYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9OlByaXZhdGVTdWJuZXQxYH0gKTtcbiAgXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgJ1ZQQ1ByaXZhdGVTdWJuZXQyJywgeyB2YWx1ZTogdnBjLnByaXZhdGVTdWJuZXRzWzFdLnN1Ym5ldElkLCBleHBvcnROYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9OlByaXZhdGVTdWJuZXQyYH0gKTtcblxuICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdWUENQcml2YXRlU3VibmV0MS1BWicsIHsgdmFsdWU6IHZwYy5wcml2YXRlU3VibmV0c1swXS5hdmFpbGFiaWxpdHlab25lfSApO1xuICBcbiAgbmV3IENmbk91dHB1dCh0aGlzLCAnVlBDUHJpdmF0ZVN1Ym5ldDItQVonLCB7IHZhbHVlOiB2cGMucHJpdmF0ZVN1Ym5ldHNbMV0uYXZhaWxhYmlsaXR5Wm9uZSB9KTtcblxuICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdDb250YWluZXJTZWN1cml0eUdyb3VwJywgeyB2YWx1ZTogZWMyU0cuc2VjdXJpdHlHcm91cElkLCBleHBvcnROYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9OkVDMlNlY3VyaXR5R3JvdXBgfSApO1xuXG4gIG5ldyBDZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHsgdmFsdWU6IGxvZ0dyb3VwLmxvZ0dyb3VwTmFtZSB9KTtcbiBcblxuICB9XG59Il19