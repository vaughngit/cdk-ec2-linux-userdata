"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EC2DeployStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const iam = require("aws-cdk-lib/aws-iam");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const fs_1 = require("fs");
const date_fns_tz_1 = require("date-fns-tz");
class EC2DeployStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const testLocationIp = "10.8.80.40/32";
        const appPort = '8001';
        //Setup VPC Configuration////////////////////////////////////////////////////////////////////////
        //Resuse VPC Option 1:    
        const vpcId = aws_cdk_lib_1.aws_ssm.StringParameter.valueFromLookup(this, `/tnc/dev/vpcId`);
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
        webserverSG.addIngressRule(ec2.Peer.ipv4(testLocationIp), ec2.Port.tcp(parseInt(appPort)), 'allow HTTP traffic from specific location');
        // Define EC2 Instance Role:  
        const role = new iam.Role(this, 'ec2-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            description: 'SSM IAM role in AWS CDK',
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
        });
        // Define EC2 Instance and Properties:
        const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
            vpc,
            role,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            securityGroup: webserverSG,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, 
            //ec2.InstanceSize.NANO,
            ec2.InstanceSize.MEDIUM),
            machineImage: new ec2.AmazonLinuxImage({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            }),
        });
        // 👇 load user data script
        const userDataScript = fs_1.readFileSync('./assets/redisInsight-user-data.sh', 'utf8');
        // 👇 add user data to the EC2 instance
        ec2Instance.addUserData(userDataScript);
        cdk.Tags.of(ec2Instance).add("Name", "CDK_Linux_EC2");
        cdk.Tags.of(ec2Instance).add("Service", "EC2");
        let date = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const centraltime = date_fns_tz_1.utcToZonedTime(date, timezone);
        const timestamp = date_fns_tz_1.format(centraltime, `yyyy-MM-dd HH:mm:ss`);
        new cdk.CfnOutput(this, "Timestamp", { value: timestamp });
        new cdk.CfnOutput(this, "public ip", { value: `${ec2Instance.instancePublicIp}:${appPort}` });
    }
}
exports.EC2DeployStack = EC2DeployStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWMyLWxpbnV4LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWMyLWxpbnV4LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDZDQUEyQztBQUUzQywyQkFBZ0M7QUFDaEMsNkNBQWtEO0FBRWxELE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzNDLFlBQVksS0FBYyxFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUE7UUFDdEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXRCLGlHQUFpRztRQUVsRywwQkFBMEI7UUFDekIsTUFBTSxLQUFLLEdBQUkscUJBQUcsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFFLElBQUksRUFBRSxnQkFBZ0IsQ0FBSyxDQUFDO1FBQ2hGLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSwrQ0FBK0MsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRzFHOzs7Ozs7O1NBT0M7UUFDQywwQkFBMEI7UUFDM0IseUZBQXlGO1FBRXhGLCtDQUErQztRQUMvQyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM5RCxHQUFHO1NBQ0osQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDOzs7Ozs7VUFNRTtRQUNILFlBQVk7UUFDWCxXQUFXLENBQUMsY0FBYyxDQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQy9CLDJDQUEyQyxDQUM1QyxDQUFDO1FBRUYsOEJBQThCO1FBQzlCLE1BQU0sSUFBSSxHQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzNDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUN4RCxXQUFXLEVBQUUseUJBQXlCO1lBQ3RDLGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUN4Qyw4QkFBOEIsQ0FDL0I7YUFDRjtTQUNGLENBQUMsQ0FBQTtRQUVGLHNDQUFzQztRQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN6RCxHQUFHO1lBQ0gsSUFBSTtZQUNKLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2FBQ2xDO1lBQ0QsYUFBYSxFQUFFLFdBQVc7WUFDMUIsWUFBWSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUMvQixHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUU7WUFDcEIsd0JBQXdCO1lBQ3hCLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUN4QjtZQUNELFlBQVksRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDckMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjO2FBQ3JELENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsTUFBTSxjQUFjLEdBQUcsaUJBQVksQ0FBQyxvQ0FBb0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsRix1Q0FBdUM7UUFDdkMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUd4QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3JELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFHaEQsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ2xFLE1BQU0sV0FBVyxHQUFFLDRCQUFjLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sU0FBUyxHQUFHLG9CQUFNLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFFNUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLEVBQUUsRUFBQyxDQUFDLENBQUE7SUFFM0YsQ0FBQztDQUVGO0FBL0ZELHdDQStGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7YXdzX3NzbSBhcyBzc20gfSBmcm9tICdhd3MtY2RrLWxpYicgXG5pbXBvcnQge2F3c19zZXJ2aWNlZGlzY292ZXJ5IGFzIHNlcnZpY2VkaXNjb3Zlcnl9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7Zm9ybWF0LHV0Y1RvWm9uZWRUaW1lfSBmcm9tICdkYXRlLWZucy10eic7XG5cbmV4cG9ydCBjbGFzcyBFQzJEZXBsb3lTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB0ZXN0TG9jYXRpb25JcCA9IFwiMTAuOC44MC40MC8zMlwiXG4gICAgY29uc3QgYXBwUG9ydCA9ICc4MDAxJ1xuXG4gICAgLy9TZXR1cCBWUEMgQ29uZmlndXJhdGlvbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIFxuICAgLy9SZXN1c2UgVlBDIE9wdGlvbiAxOiAgICBcbiAgICBjb25zdCB2cGNJZCA9ICBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCggdGhpcywgYC90bmMvZGV2L3ZwY0lkYCAgICApO1xuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCBgcmVmZXJlbmNlIHZwYyBmcm9tIHZwY2lkIHN0b3JlZCBpbiBzc20gcGFyYW1zYCwgeyB2cGNJZDogdnBjSWQgfSk7XG4gXG5cbiAgLyogIC8vUmVzdXNlIFZQQyBPcHRpb24gMjogIFxuICAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsIGByZWZlcmVuY2UgdnBjIGZyb20gdGFnc2AsIHsgXG4gICAgdGFnczp7XG4gICAgICBzb2x1dGlvbjogXCJhd2Vzb21lU29sdXRpb25cIixcbiAgICAgIGVudmlyb25tZW50OiBcImRldlwiXG4gICAgfVxuICAgIH0pO1xuICovXG4gICAgLy9WUEMgUmVmZXJlbmNlIE9wdGlvbiAzOiBcbiAgIC8vIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnZGVmYXVsdCB2cGMgaW4gYWNjb3VudCcsIHsgaXNEZWZhdWx0OiB0cnVlLCAgfSk7XG4gICBcbiAgICAvLyBDcmVhdGUgbmV3IFNlY3VyaXR5IEdyb3VwIGZvciBFQzIgSW5zdGFuY2U6IFxuICAgIGNvbnN0IHdlYnNlcnZlclNHID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICd3ZWJzZXJ2ZXItc2cnLCB7XG4gICAgICB2cGMsXG4gICAgfSk7XG5cbiAgICAvL0RlZmluZSBpbmdyZXNzIHJ1bGUgZm9yIHNlY3VyaXR5IGdyb3VwIFxuICAgIC8qICBPUHRpb24gMTpcbiAgICB3ZWJzZXJ2ZXJTRy5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXG4gICAgICAnYWxsb3cgSFRUUCB0cmFmZmljIGZyb20gYW55d2hlcmUnLFxuICAgICk7IFxuICAgICovXG4gICAvLyBPcHRpb24gMjpcbiAgICB3ZWJzZXJ2ZXJTRy5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmlwdjQodGVzdExvY2F0aW9uSXApLFxuICAgICAgZWMyLlBvcnQudGNwKHBhcnNlSW50KGFwcFBvcnQpKSxcbiAgICAgICdhbGxvdyBIVFRQIHRyYWZmaWMgZnJvbSBzcGVjaWZpYyBsb2NhdGlvbicsXG4gICAgKTtcblxuICAgIC8vIERlZmluZSBFQzIgSW5zdGFuY2UgUm9sZTogIFxuICAgIGNvbnN0IHJvbGUgPSAgbmV3IGlhbS5Sb2xlKHRoaXMsICdlYzItcm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdTU00gSUFNIHJvbGUgaW4gQVdTIENESycsXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgIFwiQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZVwiLFxuICAgICAgICApLFxuICAgICAgXSxcbiAgICB9KVxuXG4gICAgLy8gRGVmaW5lIEVDMiBJbnN0YW5jZSBhbmQgUHJvcGVydGllczpcbiAgICBjb25zdCBlYzJJbnN0YW5jZSA9IG5ldyBlYzIuSW5zdGFuY2UodGhpcywgJ2VjMi1pbnN0YW5jZScsIHtcbiAgICAgIHZwYyxcbiAgICAgIHJvbGUsXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgIH0sXG4gICAgICBzZWN1cml0eUdyb3VwOiB3ZWJzZXJ2ZXJTRyxcbiAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihcbiAgICAgICAgZWMyLkluc3RhbmNlQ2xhc3MuVDMsXG4gICAgICAgIC8vZWMyLkluc3RhbmNlU2l6ZS5OQU5PLFxuICAgICAgICBlYzIuSW5zdGFuY2VTaXplLk1FRElVTSxcbiAgICAgICksXG4gICAgICBtYWNoaW5lSW1hZ2U6IG5ldyBlYzIuQW1hem9uTGludXhJbWFnZSh7XG4gICAgICAgIGdlbmVyYXRpb246IGVjMi5BbWF6b25MaW51eEdlbmVyYXRpb24uQU1BWk9OX0xJTlVYXzIsXG4gICAgICB9KSxcbiAgICB9KTtcblxuICAgIC8vIPCfkYcgbG9hZCB1c2VyIGRhdGEgc2NyaXB0XG4gICAgY29uc3QgdXNlckRhdGFTY3JpcHQgPSByZWFkRmlsZVN5bmMoJy4vYXNzZXRzL3JlZGlzSW5zaWdodC11c2VyLWRhdGEuc2gnLCAndXRmOCcpO1xuICAgIFxuICAgIC8vIPCfkYcgYWRkIHVzZXIgZGF0YSB0byB0aGUgRUMyIGluc3RhbmNlXG4gICAgZWMySW5zdGFuY2UuYWRkVXNlckRhdGEodXNlckRhdGFTY3JpcHQpO1xuXG5cbiAgICBjZGsuVGFncy5vZihlYzJJbnN0YW5jZSkuYWRkKFwiTmFtZVwiLCBcIkNES19MaW51eF9FQzJcIilcbiAgICBjZGsuVGFncy5vZihlYzJJbnN0YW5jZSkuYWRkKFwiU2VydmljZVwiLCBcIkVDMlwiKVxuXG5cbiAgbGV0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCB0aW1lem9uZSA9IEludGwuRGF0ZVRpbWVGb3JtYXQoKS5yZXNvbHZlZE9wdGlvbnMoKS50aW1lWm9uZTtcbiAgY29uc3QgY2VudHJhbHRpbWU9IHV0Y1RvWm9uZWRUaW1lKGRhdGUsdGltZXpvbmUpXG4gIGNvbnN0IHRpbWVzdGFtcCA9IGZvcm1hdChjZW50cmFsdGltZSwgYHl5eXktTU0tZGQgSEg6bW06c3NgKSBcblxuICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlRpbWVzdGFtcFwiLCB7dmFsdWU6IHRpbWVzdGFtcCB9KTsgXG4gIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwicHVibGljIGlwXCIsIHt2YWx1ZTogYCR7ZWMySW5zdGFuY2UuaW5zdGFuY2VQdWJsaWNJcH06JHthcHBQb3J0fWB9KVxuXG4gIH1cbiAgXG59XG4iXX0=