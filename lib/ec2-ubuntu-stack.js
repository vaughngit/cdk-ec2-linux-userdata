"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UbuntuEC2Stack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const iam = require("aws-cdk-lib/aws-iam");
const fs_1 = require("fs");
const date_fns_tz_1 = require("date-fns-tz");
class UbuntuEC2Stack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const testLocationIp = "10.8.80.40/32";
        const appPort = '8001';
        // const appPort = '80'
        //Setup VPC Configuration////////////////////////////////////////////////////////////////////////
        //Resuse VPC Option 1:    
        //  const vpcId =  ssm.StringParameter.valueFromLookup( this, `/tnc/dev/vpcId`    );
        //  const vpc = ec2.Vpc.fromLookup(this, `reference vpc from vpcid stored in ssm params`, { vpcId: vpcId });
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
        //  const userData: ec2.UserData = readFileSync('./assets/ubuntu-default-user-data.sh', 'utf8');
        const machineImage = new ec2.GenericSSMParameterImage('/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id', ec2.OperatingSystemType.LINUX);
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
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, 
            //ec2.InstanceSize.NANO,
            ec2.InstanceSize.MEDIUM),
            machineImage: machineImage
        });
        // 👇 load user data script
        const userDataScript = fs_1.readFileSync('./assets/ubuntu-default-user-data.sh', 'utf8');
        // 👇 add user data to the EC2 instance
        ec2Instance.addUserData(userDataScript);
        cdk.Tags.of(ec2Instance).add("Name", "CDK_Ubuntu");
        cdk.Tags.of(ec2Instance).add("Service", "EC2");
        let date = new Date();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const centraltime = date_fns_tz_1.utcToZonedTime(date, timezone);
        const timestamp = date_fns_tz_1.format(centraltime, `yyyy-MM-dd HH:mm:ss`);
        new cdk.CfnOutput(this, "Timestamp", { value: timestamp });
        new cdk.CfnOutput(this, "public ip", { value: `${ec2Instance.instancePublicIp}:${appPort}` });
    }
}
exports.UbuntuEC2Stack = UbuntuEC2Stack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWMyLXVidW50dS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVjMi11YnVudHUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFHM0MsMkJBQWdDO0FBQ2hDLDZDQUFrRDtBQUVsRCxNQUFhLGNBQWUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMzQyxZQUFZLEtBQWMsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFBO1FBQ3RDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUN2Qix1QkFBdUI7UUFFdEIsaUdBQWlHO1FBRWxHLDBCQUEwQjtRQUMzQixvRkFBb0Y7UUFDcEYsNEdBQTRHO1FBRzVHOzs7Ozs7O1NBT0M7UUFDQywwQkFBMEI7UUFDMUIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksR0FBSSxDQUFDLENBQUM7UUFFdEYsK0NBQStDO1FBQy9DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzlELEdBQUc7U0FDSixDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekM7Ozs7OztVQU1FO1FBQ0gsWUFBWTtRQUNYLFdBQVcsQ0FBQyxjQUFjLENBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFDL0IsMkNBQTJDLENBQzVDLENBQUM7UUFFRiw4QkFBOEI7UUFDOUIsTUFBTSxJQUFJLEdBQUksSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDM0MsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO1lBQ3hELFdBQVcsRUFBRSx5QkFBeUI7WUFDdEMsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQ3hDLDhCQUE4QixDQUMvQjthQUNGO1NBQ0YsQ0FBQyxDQUFBO1FBRUosZ0dBQWdHO1FBRTlGLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLHdCQUF3QixDQUNuRCxvRkFBb0YsRUFDcEYsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FFOUIsQ0FBQTtRQUVELHNDQUFzQztRQUN0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN6RCxHQUFHO1lBQ0gsSUFBSTtZQUNKLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2FBQ2xDO1lBQ0QsNkNBQTZDO1lBQzdDLDREQUE0RDtZQUM1RCxrRUFBa0U7WUFDbEUsS0FBSztZQUNMLGFBQWEsRUFBRSxXQUFXO1lBQzFCLFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FDL0IsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ3BCLHdCQUF3QjtZQUN4QixHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FDeEI7WUFDRCxZQUFZLEVBQUUsWUFBWTtTQUUzQixDQUFDLENBQUM7UUFFRiwyQkFBMkI7UUFDNUIsTUFBTSxjQUFjLEdBQUcsaUJBQVksQ0FBQyxzQ0FBc0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVwRix1Q0FBdUM7UUFDdkMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUd4QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFHaEQsSUFBSSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ2xFLE1BQU0sV0FBVyxHQUFFLDRCQUFjLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sU0FBUyxHQUFHLG9CQUFNLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFFNUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLEVBQUUsRUFBQyxDQUFDLENBQUE7SUFFM0YsQ0FBQztDQUVGO0FBM0dELHdDQTJHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7YXdzX3NzbSBhcyBzc20gfSBmcm9tICdhd3MtY2RrLWxpYicgXG5pbXBvcnQge2F3c19zZXJ2aWNlZGlzY292ZXJ5IGFzIHNlcnZpY2VkaXNjb3Zlcnl9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHtyZWFkRmlsZVN5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCB7Zm9ybWF0LHV0Y1RvWm9uZWRUaW1lfSBmcm9tICdkYXRlLWZucy10eic7XG5cbmV4cG9ydCBjbGFzcyBVYnVudHVFQzJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB0ZXN0TG9jYXRpb25JcCA9IFwiMTAuOC44MC40MC8zMlwiXG4gICAgY29uc3QgYXBwUG9ydCA9ICc4MDAxJ1xuICAgLy8gY29uc3QgYXBwUG9ydCA9ICc4MCdcblxuICAgIC8vU2V0dXAgVlBDIENvbmZpZ3VyYXRpb24vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbiAgICBcbiAgIC8vUmVzdXNlIFZQQyBPcHRpb24gMTogICAgXG4gIC8vICBjb25zdCB2cGNJZCA9ICBzc20uU3RyaW5nUGFyYW1ldGVyLnZhbHVlRnJvbUxvb2t1cCggdGhpcywgYC90bmMvZGV2L3ZwY0lkYCAgICApO1xuICAvLyAgY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsIGByZWZlcmVuY2UgdnBjIGZyb20gdnBjaWQgc3RvcmVkIGluIHNzbSBwYXJhbXNgLCB7IHZwY0lkOiB2cGNJZCB9KTtcbiBcblxuICAvKiAgLy9SZXN1c2UgVlBDIE9wdGlvbiAyOiAgXG4gICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgYHJlZmVyZW5jZSB2cGMgZnJvbSB0YWdzYCwgeyBcbiAgICB0YWdzOntcbiAgICAgIHNvbHV0aW9uOiBcImF3ZXNvbWVTb2x1dGlvblwiLFxuICAgICAgZW52aXJvbm1lbnQ6IFwiZGV2XCJcbiAgICB9XG4gICAgfSk7XG4gKi9cbiAgICAvL1ZQQyBSZWZlcmVuY2UgT3B0aW9uIDM6IFxuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnZGVmYXVsdCB2cGMgaW4gYWNjb3VudCcsIHsgaXNEZWZhdWx0OiB0cnVlLCAgfSk7XG4gICBcbiAgICAvLyBDcmVhdGUgbmV3IFNlY3VyaXR5IEdyb3VwIGZvciBFQzIgSW5zdGFuY2U6IFxuICAgIGNvbnN0IHdlYnNlcnZlclNHID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICd3ZWJzZXJ2ZXItc2cnLCB7XG4gICAgICB2cGMsXG4gICAgfSk7XG5cbiAgICAvL0RlZmluZSBpbmdyZXNzIHJ1bGUgZm9yIHNlY3VyaXR5IGdyb3VwIFxuICAgIC8qICBPUHRpb24gMTpcbiAgICB3ZWJzZXJ2ZXJTRy5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXG4gICAgICAnYWxsb3cgSFRUUCB0cmFmZmljIGZyb20gYW55d2hlcmUnLFxuICAgICk7IFxuICAgICovXG4gICAvLyBPcHRpb24gMjpcbiAgICB3ZWJzZXJ2ZXJTRy5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmlwdjQodGVzdExvY2F0aW9uSXApLFxuICAgICAgZWMyLlBvcnQudGNwKHBhcnNlSW50KGFwcFBvcnQpKSxcbiAgICAgICdhbGxvdyBIVFRQIHRyYWZmaWMgZnJvbSBzcGVjaWZpYyBsb2NhdGlvbicsXG4gICAgKTtcblxuICAgIC8vIERlZmluZSBFQzIgSW5zdGFuY2UgUm9sZTogIFxuICAgIGNvbnN0IHJvbGUgPSAgbmV3IGlhbS5Sb2xlKHRoaXMsICdlYzItcm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgICAgZGVzY3JpcHRpb246ICdTU00gSUFNIHJvbGUgaW4gQVdTIENESycsXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgIFwiQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZVwiLFxuICAgICAgICApLFxuICAgICAgXSxcbiAgICB9KVxuXG4gIC8vICBjb25zdCB1c2VyRGF0YTogZWMyLlVzZXJEYXRhID0gcmVhZEZpbGVTeW5jKCcuL2Fzc2V0cy91YnVudHUtZGVmYXVsdC11c2VyLWRhdGEuc2gnLCAndXRmOCcpO1xuXG4gICAgY29uc3QgbWFjaGluZUltYWdlID0gbmV3IGVjMi5HZW5lcmljU1NNUGFyYW1ldGVySW1hZ2UoXG4gICAgICAnL2F3cy9zZXJ2aWNlL2Nhbm9uaWNhbC91YnVudHUvc2VydmVyL2ZvY2FsL3N0YWJsZS9jdXJyZW50L2FtZDY0L2h2bS9lYnMtZ3AyL2FtaS1pZCcsXG4gICAgICBlYzIuT3BlcmF0aW5nU3lzdGVtVHlwZS5MSU5VWCxcbiAgICAgLy8gdXNlckRhdGFcbiAgICApXG5cbiAgICAvLyBEZWZpbmUgRUMyIEluc3RhbmNlIGFuZCBQcm9wZXJ0aWVzOlxuICAgIGNvbnN0IGVjMkluc3RhbmNlID0gbmV3IGVjMi5JbnN0YW5jZSh0aGlzLCAnZWMyLWluc3RhbmNlJywge1xuICAgICAgdnBjLFxuICAgICAgcm9sZSxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxuICAgICAgfSxcbiAgICAgIC8vIGluaXQ6IGVjMi5DbG91ZEZvcm1hdGlvbkluaXQuZnJvbUVsZW1lbnRzKFxuICAgICAgLy8gICBlYzIuSW5pdENvbW1hbmQuc2hlbGxDb21tYW5kKCdzdWRvIGFwdC1nZXQgdXBkYXRlIC15JyksXG4gICAgICAvLyAgIGVjMi5Jbml0Q29tbWFuZC5zaGVsbENvbW1hbmQoJ3N1ZG8gYXB0LWdldCBpbnN0YWxsIC15IG5naW54JylcbiAgICAgIC8vICksXG4gICAgICBzZWN1cml0eUdyb3VwOiB3ZWJzZXJ2ZXJTRyxcbiAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihcbiAgICAgICAgZWMyLkluc3RhbmNlQ2xhc3MuVDMsXG4gICAgICAgIC8vZWMyLkluc3RhbmNlU2l6ZS5OQU5PLFxuICAgICAgICBlYzIuSW5zdGFuY2VTaXplLk1FRElVTSxcbiAgICAgICksXG4gICAgICBtYWNoaW5lSW1hZ2U6IG1hY2hpbmVJbWFnZVxuXG4gICAgfSk7XG5cbiAgICAgLy8g8J+RhyBsb2FkIHVzZXIgZGF0YSBzY3JpcHRcbiAgICBjb25zdCB1c2VyRGF0YVNjcmlwdCA9IHJlYWRGaWxlU3luYygnLi9hc3NldHMvdWJ1bnR1LWRlZmF1bHQtdXNlci1kYXRhLnNoJywgJ3V0ZjgnKTtcbiAgICBcbiAgICAvLyDwn5GHIGFkZCB1c2VyIGRhdGEgdG8gdGhlIEVDMiBpbnN0YW5jZVxuICAgIGVjMkluc3RhbmNlLmFkZFVzZXJEYXRhKHVzZXJEYXRhU2NyaXB0KTtcbiBcblxuICAgIGNkay5UYWdzLm9mKGVjMkluc3RhbmNlKS5hZGQoXCJOYW1lXCIsIFwiQ0RLX1VidW50dVwiKVxuICAgIGNkay5UYWdzLm9mKGVjMkluc3RhbmNlKS5hZGQoXCJTZXJ2aWNlXCIsIFwiRUMyXCIpXG5cblxuICBsZXQgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHRpbWV6b25lID0gSW50bC5EYXRlVGltZUZvcm1hdCgpLnJlc29sdmVkT3B0aW9ucygpLnRpbWVab25lO1xuICBjb25zdCBjZW50cmFsdGltZT0gdXRjVG9ab25lZFRpbWUoZGF0ZSx0aW1lem9uZSlcbiAgY29uc3QgdGltZXN0YW1wID0gZm9ybWF0KGNlbnRyYWx0aW1lLCBgeXl5eS1NTS1kZCBISDptbTpzc2ApIFxuXG4gIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVGltZXN0YW1wXCIsIHt2YWx1ZTogdGltZXN0YW1wIH0pOyBcbiAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJwdWJsaWMgaXBcIiwge3ZhbHVlOiBgJHtlYzJJbnN0YW5jZS5pbnN0YW5jZVB1YmxpY0lwfToke2FwcFBvcnR9YH0pXG5cbiAgfVxuICBcbn1cbiJdfQ==