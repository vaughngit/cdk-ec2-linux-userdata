"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UbuntuEc2UserdataStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_2 = require("aws-cdk-lib");
class UbuntuEc2UserdataStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        const vpc = ec2.Vpc.fromLookup(this, 'default vpc in account', { isDefault: true, });
        //import the VPC 
        // const vpcId = ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/vpcId`)
        // const vpc = ec2.Vpc.fromLookup(this, `${props.solutionName}-import-vpc`, { vpcId });
        // Create new Security Group for EC2 Instance: 
        const appserverSG = new ec2.SecurityGroup(this, 'app-server-sg', { vpc, });
        //Define ingress rule for security group 
        //  OPtion 1:
        // appserverSG.addIngressRule(
        //   ec2.Peer.anyIpv4(),
        //   ec2.Port.tcp(props.appPort),
        //   'allow app traffic from anywhere',
        // ); 
        // Option 2:
        appserverSG.addIngressRule(ec2.Peer.ipv4(props.testingLocation), 
        //ec2.Port.tcp(parseInt(appPort)),
        ec2.Port.tcp(props.appPort), 'allow app traffic from specific location');
        /*
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
         */
        //user data: 
        const userData = ec2.UserData.forLinux();
        userData.addCommands('apt-get update -y', 'apt-get install -y git awscli ec2-instance-connect', 'cd /', 'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done');
        const machineImage = new ec2.GenericSSMParameterImage('/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id', ec2.OperatingSystemType.LINUX, userData);
        // Define EC2 Instance Role:  
        const role = new iam.Role(this, 'ec2-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: 'SSM IAM role in AWS CDK',
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
        });
        const rootVolume = {
            deviceName: '/dev/sda1',
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
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, 
            //ec2.InstanceSize.NANO,
            ec2.InstanceSize.SMALL),
            machineImage: machineImage
        });
        // InstanceID SSM Param
        new aws_cdk_lib_2.aws_ssm.StringParameter(this, 'vpcid ssm param', {
            parameterName: `/${props.solutionName}/${props.environment}/instanceId`,
            stringValue: ec2Instance.instanceId,
            description: `param for /${props.solutionName}/${props.environment}/ instanceId`,
            type: aws_cdk_lib_2.aws_ssm.ParameterType.STRING,
            tier: aws_cdk_lib_2.aws_ssm.ParameterTier.INTELLIGENT_TIERING,
            allowedPattern: '.*',
        });
        cdk.Tags.of(this).add("Name", props.serviceName);
        //cdk.Tags.of(this).add("Service", "EC2")
        aws_cdk_lib_1.Tags.of(this).add("solution", props.solutionName);
        aws_cdk_lib_1.Tags.of(this).add("environment", props.environment);
        aws_cdk_lib_1.Tags.of(this).add("costcenter", props.costcenter);
        // let date = new Date();
        // const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // const centraltime= utcToZonedTime(date,timezone)
        // const timestamp = format(centraltime, `yyyy-MM-dd HH:mm:ss`) 
        //new cdk.CfnOutput(this, "Timestamp", {value: timestamp }); 
        new cdk.CfnOutput(this, "private ip", { value: `${ec2Instance.instancePrivateIp}` });
        new cdk.CfnOutput(this, "instanceId", { value: `${ec2Instance.instanceId}` });
        new cdk.CfnOutput(this, "public ip", { value: `${ec2Instance.instancePublicIp}` });
    }
}
exports.UbuntuEc2UserdataStack = UbuntuEc2UserdataStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWMyLXVidW50dS11c2VyZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVjMi11YnVudHUtdXNlcmRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDZDQUFpRjtBQUVqRiwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZDQUEyQztBQW1CM0MsTUFBYSxzQkFBdUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNuRCxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekIseUNBQXlDO1FBQ3hDLHdCQUF3QjtRQUN6QiwwQkFBMEI7UUFFekIsaUdBQWlHO1FBRW5HOzs7Ozs7O1NBT0M7UUFDQywwQkFBMEI7UUFDMUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksR0FBSSxDQUFDLENBQUM7UUFHdkYsaUJBQWlCO1FBQ2xCLCtHQUErRztRQUMvRyx1RkFBdUY7UUFFckYsK0NBQStDO1FBQy9DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLEVBQUUsR0FBRyxHQUFJLENBQUMsQ0FBQztRQUU1RSx5Q0FBeUM7UUFDekMsYUFBYTtRQUNiLDhCQUE4QjtRQUM5Qix3QkFBd0I7UUFDeEIsaUNBQWlDO1FBQ2pDLHVDQUF1QztRQUN2QyxNQUFNO1FBRUgsWUFBWTtRQUNmLFdBQVcsQ0FBQyxjQUFjLENBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDcEMsa0NBQWtDO1FBQ2xDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMs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QkFBeUI7UUFDekIscUVBQXFFO1FBQ3JFLG1EQUFtRDtRQUNuRCxnRUFBZ0U7UUFFaEUsNkRBQTZEO1FBQzdELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUMsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEVBQUMsQ0FBQyxDQUFBO1FBQ2xGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUMsS0FBSyxFQUFFLEdBQUcsV0FBVyxDQUFDLFVBQVUsRUFBRSxFQUFDLENBQUMsQ0FBQTtRQUMzRSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFDLENBQUMsQ0FBQTtJQUNoRixDQUFDO0NBRUY7QUFoSkQsd0RBZ0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzLCBEdXJhdGlvbiwgQ2ZuT3V0cHV0LCBUYWdzLCBTaXplIH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQge2F3c19zc20gYXMgc3NtIH0gZnJvbSAnYXdzLWNkay1saWInIFxuaW1wb3J0IHthd3Nfc2VydmljZWRpc2NvdmVyeSBhcyBzZXJ2aWNlZGlzY292ZXJ5fSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQge2Zvcm1hdCx1dGNUb1pvbmVkVGltZX0gZnJvbSAnZGF0ZS1mbnMtdHonO1xuaW1wb3J0IHsgQ2ZuS2V5UGFpciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuXG5pbnRlcmZhY2UgSVN0YWNrUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgc29sdXRpb25OYW1lOiBzdHJpbmc7XG4gIHNlcnZpY2VOYW1lOiBzdHJpbmc7ICBcbiAgYXBwUG9ydDogbnVtYmVyO1xuICBlYzJLZXlOYW1lOiBzdHJpbmc7IFxuICB0ZXN0aW5nTG9jYXRpb246IHN0cmluZzsgXG4gIGVudmlyb25tZW50OiBzdHJpbmc7IFxuICBjb3N0Y2VudGVyOiBzdHJpbmc7IFxuICBkdHN0YW1wOiBzdHJpbmc7IFxufVxuXG5leHBvcnQgY2xhc3MgVWJ1bnR1RWMyVXNlcmRhdGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wczogSVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgLy8gY29uc3QgdGVzdExvY2F0aW9uSXAgPSBcIjEwLjguODAuNDAvMzJcIlxuICAgIC8vY29uc3QgYXBwUG9ydCA9ICc4MDAxJ1xuICAgLy8gY29uc3QgYXBwUG9ydCA9IFwiMjcwMTdcIlxuXG4gICAgLy9TZXR1cCBWUEMgQ29uZmlndXJhdGlvbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIFxuICAvKiAgLy9SZXN1c2UgVlBDIE9wdGlvbiAyOiAgXG4gICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgYHJlZmVyZW5jZSB2cGMgZnJvbSB0YWdzYCwgeyBcbiAgICB0YWdzOntcbiAgICAgIHNvbHV0aW9uOiBcImF3ZXNvbWVTb2x1dGlvblwiLFxuICAgICAgZW52aXJvbm1lbnQ6IFwiZGV2XCJcbiAgICB9XG4gICAgfSk7XG4gKi9cbiAgICAvL1ZQQyBSZWZlcmVuY2UgT3B0aW9uIDM6IFxuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnZGVmYXVsdCB2cGMgaW4gYWNjb3VudCcsIHsgaXNEZWZhdWx0OiB0cnVlLCAgfSk7XG5cblxuICAgLy9pbXBvcnQgdGhlIFZQQyBcbiAgLy8gY29uc3QgdnBjSWQgPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLCBgLyR7cHJvcHMuc29sdXRpb25OYW1lfS8ke3Byb3BzLmVudmlyb25tZW50fS92cGNJZGApXG4gIC8vIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LWltcG9ydC12cGNgLCB7IHZwY0lkIH0pO1xuXG4gICAgLy8gQ3JlYXRlIG5ldyBTZWN1cml0eSBHcm91cCBmb3IgRUMyIEluc3RhbmNlOiBcbiAgICBjb25zdCBhcHBzZXJ2ZXJTRyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnYXBwLXNlcnZlci1zZycsIHsgdnBjLCAgfSk7XG5cbiAgICAvL0RlZmluZSBpbmdyZXNzIHJ1bGUgZm9yIHNlY3VyaXR5IGdyb3VwIFxuICAgIC8vICBPUHRpb24gMTpcbiAgICAvLyBhcHBzZXJ2ZXJTRy5hZGRJbmdyZXNzUnVsZShcbiAgICAvLyAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAvLyAgIGVjMi5Qb3J0LnRjcChwcm9wcy5hcHBQb3J0KSxcbiAgICAvLyAgICdhbGxvdyBhcHAgdHJhZmZpYyBmcm9tIGFueXdoZXJlJyxcbiAgICAvLyApOyBcblxuICAgICAgIC8vIE9wdGlvbiAyOlxuICAgIGFwcHNlcnZlclNHLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgZWMyLlBlZXIuaXB2NChwcm9wcy50ZXN0aW5nTG9jYXRpb24pLFxuICAgICAgLy9lYzIuUG9ydC50Y3AocGFyc2VJbnQoYXBwUG9ydCkpLFxuICAgICAgZWMyLlBvcnQudGNwKHByb3BzLmFwcFBvcnQpLFxuICAgICAgJ2FsbG93IGFwcCB0cmFmZmljIGZyb20gc3BlY2lmaWMgbG9jYXRpb24nLFxuICAgICk7XG4vKiBcbiAgICAvLyDwn5GHIGltcG9ydCBzZWN1cml0eSBncm91cHMgYnkgSURcbiAgICBjb25zdCBlYzJTZ0lkU3NtUGFyYW0gPSBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCh0aGlzLGAvJHtwcm9wcy5zb2x1dGlvbk5hbWV9LyR7cHJvcHMuZW52aXJvbm1lbnR9L2VjMlNnSWRgKVxuICAgIGNvbnN0IGVjMlNHID0gZWMyLlNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZCh0aGlzLCdpbXBvcnRlZC1zZycsICBlYzJTZ0lkU3NtUGFyYW0gICk7XG4gICAgZWMyU0cuY29ubmVjdGlvbnMuYWxsb3dGcm9tKFxuICAgICAgbmV3IGVjMi5Db25uZWN0aW9ucyh7XG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbYXBwc2VydmVyU0ddLFxuICAgICAgfSksXG4gICAgICBlYzIuUG9ydC5hbGxUcmFmZmljKCksXG4gICAgICBgYWxsb3cgdHJhZmZpYyBvbiBwb3J0IGZyb20gdGhlIEFMQiBzZWN1cml0eSBncm91cCB0aHJvdWdoIHRvIGVjcyBzZWN1cml0eSBncm91cGAsXG4gICAgKVxuICovXG5cbiAgICAvL3VzZXIgZGF0YTogXG4gICAgY29uc3QgdXNlckRhdGEgPSBlYzIuVXNlckRhdGEuZm9yTGludXgoKVxuICAgIHVzZXJEYXRhLmFkZENvbW1hbmRzKFxuICAgICAgJ2FwdC1nZXQgdXBkYXRlIC15JyxcbiAgICAgICdhcHQtZ2V0IGluc3RhbGwgLXkgZ2l0IGF3c2NsaSBlYzItaW5zdGFuY2UtY29ubmVjdCcsXG4gICAgICAnY2QgLycsXG4gICAgICAndW50aWwgZ2l0IGNsb25lIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MtcXVpY2tzdGFydC9xdWlja3N0YXJ0LWxpbnV4LXV0aWxpdGllcy5naXQ7IGRvIGVjaG8gXCJSZXRyeWluZ1wiOyBkb25lJyxcbiAgICAgIC8vJ3VudGlsIGdpdCBjbG9uZSBodHRwczovL2dpdGh1Yi5jb20vdmF1Z2huZ2l0L2F3cy1jZGsuZ2l0OyBkbyBlY2hvIFwiUmV0cnlpbmdcIjsgZG9uZScsXG4gICAgICAvLydjZCAvYXdzLWNkaydcbiAgICApXG5cblxuICBjb25zdCBtYWNoaW5lSW1hZ2UgPSBuZXcgZWMyLkdlbmVyaWNTU01QYXJhbWV0ZXJJbWFnZShcbiAgICAnL2F3cy9zZXJ2aWNlL2Nhbm9uaWNhbC91YnVudHUvc2VydmVyL2ZvY2FsL3N0YWJsZS9jdXJyZW50L2FtZDY0L2h2bS9lYnMtZ3AyL2FtaS1pZCcsXG4gICAgZWMyLk9wZXJhdGluZ1N5c3RlbVR5cGUuTElOVVgsXG4gICAgdXNlckRhdGFcbiAgKVxuICAgIFxuXG5cbiAgLy8gRGVmaW5lIEVDMiBJbnN0YW5jZSBSb2xlOiAgXG4gIGNvbnN0IHJvbGUgPSAgbmV3IGlhbS5Sb2xlKHRoaXMsICdlYzItcm9sZScsIHtcbiAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWMyLmFtYXpvbmF3cy5jb20nKSxcbiAgICBkZXNjcmlwdGlvbjogJ1NTTSBJQU0gcm9sZSBpbiBBV1MgQ0RLJyxcbiAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgXCJBbWF6b25TU01NYW5hZ2VkSW5zdGFuY2VDb3JlXCIsXG4gICAgICApLFxuICAgIF0sXG4gIH0pXG5cblxuICBjb25zdCByb290Vm9sdW1lOiBlYzIuQmxvY2tEZXZpY2UgPSB7XG4gICAgZGV2aWNlTmFtZTogJy9kZXYvc2RhMScsIC8vIFVzZSB0aGUgcm9vdCBkZXZpY2UgbmFtZSBmcm9tIFN0ZXAgMVxuICAgIC8vdm9sdW1lOiBlYzIuQmxvY2tEZXZpY2VWb2x1bWUuZWJzKDUwKSwgLy8gT3ZlcnJpZGUgdGhlIHZvbHVtZSBzaXplIGluIEdpYmlieXRlcyAoR2lCKVxuICAgIHZvbHVtZTogZWMyLkJsb2NrRGV2aWNlVm9sdW1lLmVicyg1MDApXG4gIH07XG5cbiAgICAvLyBEZWZpbmUgRUMyIEluc3RhbmNlIGFuZCBQcm9wZXJ0aWVzOlxuICAgIGNvbnN0IGVjMkluc3RhbmNlID0gbmV3IGVjMi5JbnN0YW5jZSh0aGlzLCAnZWMyLWluc3RhbmNlJywge1xuICAgICAgdnBjLFxuICAgICAgcm9sZSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgLy9zdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfTkFULFxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICB9LFxuICAgICAgYmxvY2tEZXZpY2VzOiBbcm9vdFZvbHVtZV0sXG4gICAgICBzZWN1cml0eUdyb3VwOiBhcHBzZXJ2ZXJTRyxcbiAgICAgIGtleU5hbWU6IHByb3BzLmVjMktleU5hbWUsIFxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKFxuICAgICAgICBlYzIuSW5zdGFuY2VDbGFzcy5UMyxcbiAgICAgICAgLy9lYzIuSW5zdGFuY2VTaXplLk5BTk8sXG4gICAgICAgIGVjMi5JbnN0YW5jZVNpemUuU01BTEwsXG4gICAgICApLFxuICAgICAgbWFjaGluZUltYWdlOiBtYWNoaW5lSW1hZ2VcbiAgICB9KTtcblxuICAgIFxuICAgICAgLy8gSW5zdGFuY2VJRCBTU00gUGFyYW1cbiAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ3ZwY2lkIHNzbSBwYXJhbScsIHtcbiAgICBwYXJhbWV0ZXJOYW1lOiBgLyR7cHJvcHMuc29sdXRpb25OYW1lfS8ke3Byb3BzLmVudmlyb25tZW50fS9pbnN0YW5jZUlkYCxcbiAgICBzdHJpbmdWYWx1ZTogZWMySW5zdGFuY2UuaW5zdGFuY2VJZCxcbiAgICBkZXNjcmlwdGlvbjogYHBhcmFtIGZvciAvJHtwcm9wcy5zb2x1dGlvbk5hbWV9LyR7cHJvcHMuZW52aXJvbm1lbnR9LyBpbnN0YW5jZUlkYCxcbiAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuSU5URUxMSUdFTlRfVElFUklORyxcbiAgICBhbGxvd2VkUGF0dGVybjogJy4qJyxcbiAgfSk7XG5cblxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZChcIk5hbWVcIiwgcHJvcHMuc2VydmljZU5hbWUpXG4gICAgLy9jZGsuVGFncy5vZih0aGlzKS5hZGQoXCJTZXJ2aWNlXCIsIFwiRUMyXCIpXG4gICAgVGFncy5vZih0aGlzKS5hZGQoXCJzb2x1dGlvblwiLCBwcm9wcy5zb2x1dGlvbk5hbWUpXG4gICAgVGFncy5vZih0aGlzKS5hZGQoXCJlbnZpcm9ubWVudFwiLCBwcm9wcy5lbnZpcm9ubWVudClcbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcImNvc3RjZW50ZXJcIiwgcHJvcHMuY29zdGNlbnRlcilcblxuXG4gIC8vIGxldCBkYXRlID0gbmV3IERhdGUoKTtcbiAgLy8gY29uc3QgdGltZXpvbmUgPSBJbnRsLkRhdGVUaW1lRm9ybWF0KCkucmVzb2x2ZWRPcHRpb25zKCkudGltZVpvbmU7XG4gIC8vIGNvbnN0IGNlbnRyYWx0aW1lPSB1dGNUb1pvbmVkVGltZShkYXRlLHRpbWV6b25lKVxuICAvLyBjb25zdCB0aW1lc3RhbXAgPSBmb3JtYXQoY2VudHJhbHRpbWUsIGB5eXl5LU1NLWRkIEhIOm1tOnNzYCkgXG5cbiAgLy9uZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlRpbWVzdGFtcFwiLCB7dmFsdWU6IHRpbWVzdGFtcCB9KTsgXG4gIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwicHJpdmF0ZSBpcFwiLCB7dmFsdWU6IGAke2VjMkluc3RhbmNlLmluc3RhbmNlUHJpdmF0ZUlwfWB9KVxuICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcImluc3RhbmNlSWRcIiwge3ZhbHVlOiBgJHtlYzJJbnN0YW5jZS5pbnN0YW5jZUlkfWB9KVxuICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcInB1YmxpYyBpcFwiLCB7dmFsdWU6IGAke2VjMkluc3RhbmNlLmluc3RhbmNlUHVibGljSXB9YH0pXG4gIH1cbiAgXG59XG4iXX0=