"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EC2WindowsStack = void 0;
const cdk = require("aws-cdk-lib");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_cdk_lib_3 = require("aws-cdk-lib");
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const aws_cdk_lib_4 = require("aws-cdk-lib");
const aws_s3_assets_1 = require("aws-cdk-lib/aws-s3-assets");
const path = require("path");
var generator = require('generate-password');
class EC2WindowsStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        //hardcoded credentails intended for TESTING ENVIRONMENTS only 
        const user = "demouser";
        //const password = "SuperSecretPwd11!!"
        var password = generator.generate({
            length: 16,
            numbers: true,
            exclude: "@£$%&*()#€"
        });
        //Target Default VPC
        // const vpc = ec2.Vpc.fromLookup(this, 'import default vpc', { isDefault: true });
        //import the VPC 
        const vpcId = aws_cdk_lib_4.aws_ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/vpcId`);
        const vpc = aws_cdk_lib_3.aws_ec2.Vpc.fromLookup(this, `${props.solutionName}-import-vpc`, { vpcId });
        //Create Instance SecurityGroup -
        const serverSG = new aws_cdk_lib_3.aws_ec2.SecurityGroup(this, 'create security group for instance', { vpc });
        // NO INBOUND TRAFFIC ALLOWED    
        // uncomment to allow port web traffic ingress into web server traffic 
        // serverSG.addIngressRule( ec2.Peer.anyIpv4(), ec2.Port.tcp(3389), 'allow RDP traffic from anywhere')
        // uncomment to allow RDP Traffic ingress over the internet into server traffic
        //serverSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow HTTP traffic from anywhere' ); 
        //Create ec2 instance role 
        const Instancerole = new aws_cdk_lib_2.aws_iam.Role(this, 'ec2 instance role', {
            assumedBy: new aws_cdk_lib_2.aws_iam.ServicePrincipal('ec2.amazonaws.com'),
            roleName: "EC2_SSM_Instance_Role",
            description: 'SSM IAM role in AWS CDK',
            managedPolicies: [
                aws_cdk_lib_2.aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
            ],
        });
        ///*  Add inline policy to role created above */
        Instancerole.addToPolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
            actions: ["logs:DescribeLogGroups", "logs:CreateLogGroup"],
            resources: ["*"]
        }));
        Instancerole.addToPolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
            actions: ["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents"],
            //resources : ["arn:aws:logs:*:*:log-group:/aws/systemManager/SessionManagerLogs" ] //specify write only to specific logGroup
            resources: ["*"]
        }));
        // const bucketName = ssm.StringParameter.valueFromLookup(this, `/${props.solutionName}/${props.environment}/s3/name`)
        // const assetBucket = s3.Bucket.fromBucketName(this, "getAssetBuck", bucketName)
        // const assetBucket = s3.Bucket.fromBucketName(this, "MyBucket", ssm.StringParameter.valueForStringParameter(this, `/${props.solutionName}/${props.environment}/s3/name`))
        Instancerole.addToPolicy(new aws_cdk_lib_2.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
            actions: ["s3:*"],
            // resources : [assetBucket.bucketArn ] //specify write only to specific logGroup
            resources: ["*"]
        }));
        const asset = new aws_s3_assets_1.Asset(this, 'Asset', {
            //path: './configure.sh'
            //path: "./assets/diskBenchmark/win_app_benchmark_4000f2.exe",
            path: path.join(__dirname, "../assets/diskBenchmark/win_app_benchmark_4000f2.exe"),
        });
        asset.grantRead(Instancerole);
        //Configure UserData Scripts to create demouser and install base webserver
        const multipartUserData = new aws_cdk_lib_3.aws_ec2.MultipartUserData;
        const commandsUserData = aws_cdk_lib_3.aws_ec2.UserData.forWindows();
        multipartUserData.addUserDataPart(commandsUserData, aws_ec2_1.MultipartBody.SHELL_SCRIPT);
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
        commandsUserData.addS3DownloadCommand({ bucket: asset.bucket, bucketKey: asset.s3ObjectKey });
        commandsUserData.addCommands("cd aws-cdk");
        // uncomment to install IIS webserver 
        // commandsUserData.addCommands("Install-WindowsFeature -name Web-Server -IncludeManagementTools");
        const rootVolume = {
            deviceName: '/dev/sda1',
            //volume: ec2.BlockDeviceVolume.ebs(50), // Override the volume size in Gibibytes (GiB)
            volume: aws_cdk_lib_3.aws_ec2.BlockDeviceVolume.ebs(500)
        };
        //Create EC2 Instance: 
        const ec2Instance = new aws_cdk_lib_3.aws_ec2.Instance(this, 'ec2-instance', {
            vpc,
            role: Instancerole,
            securityGroup: serverSG,
            keyName: props.ec2KeyName,
            blockDevices: [rootVolume],
            vpcSubnets: {
                subnetType: aws_cdk_lib_3.aws_ec2.SubnetType.PRIVATE_WITH_NAT,
            },
            machineImage: new aws_cdk_lib_3.aws_ec2.WindowsImage(aws_ec2_1.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
            instanceType: aws_cdk_lib_3.aws_ec2.InstanceType.of(aws_cdk_lib_3.aws_ec2.InstanceClass.T3A, aws_cdk_lib_3.aws_ec2.InstanceSize.MEDIUM),
            // instanceName: "TestWindowInstance-js-cdk",
            userData: commandsUserData
        });
        aws_cdk_lib_1.Tags.of(this).add("Name", props.appName);
        aws_cdk_lib_1.Tags.of(this).add("appName", props.appName);
        aws_cdk_lib_1.Tags.of(this).add("solution", props.solutionName);
        aws_cdk_lib_1.Tags.of(this).add("environment", props.environment);
        aws_cdk_lib_1.Tags.of(this).add("costcenter", props.costcenter);
        new cdk.CfnOutput(this, 'username', { value: user });
        new cdk.CfnOutput(this, 'password', { value: password });
        new cdk.CfnOutput(this, 'InstanceId', { value: ec2Instance.instanceId });
        new cdk.CfnOutput(this, 'InstancePrivateDnsName', { value: ec2Instance.instancePrivateDnsName });
    }
}
exports.EC2WindowsStack = EC2WindowsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWMyLXdpbmRvd3Mtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlYzItd2luZG93cy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFFbkMsNkNBQXlEO0FBQ3pELDZDQUEyQztBQUMzQyw2Q0FBMkM7QUFDM0MsaURBQTZFO0FBRzdFLDZDQUEyQztBQUUzQyw2REFBa0Q7QUFDbEQsNkJBQThCO0FBQzlCLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBYzdDLE1BQWEsZUFBZ0IsU0FBUSxtQkFBSztJQUN4QyxZQUFZLEtBQVUsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDcEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUIsK0RBQStEO1FBQy9ELE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQTtRQUN2Qix1Q0FBdUM7UUFDdkMsSUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQztZQUNoQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLFlBQVk7U0FDdEIsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CO1FBQ3JCLG1GQUFtRjtRQUVoRixpQkFBaUI7UUFDakIsTUFBTSxLQUFLLEdBQUcscUJBQUcsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLFdBQVcsUUFBUSxDQUFDLENBQUE7UUFDNUcsTUFBTSxHQUFHLEdBQUcscUJBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxZQUFZLGFBQWEsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFdEYsaUNBQWlDO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxF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QyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsRUFBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLHNCQUFzQixFQUFDLENBQUMsQ0FBQTtJQUVoRyxDQUFDO0NBRUY7QUF0SkQsMENBc0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHtBcHAsIFN0YWNrLCBUYWdzLCBTdGFja1Byb3BzfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQge2F3c19pYW0gYXMgaWFtIH1mcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQge2F3c19lYzIgYXMgZWMyIH1mcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQge011bHRpcGFydEJvZHksIFVzZXJEYXRhLCBXaW5kb3dzVmVyc2lvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0IHthd3Nfc2VjcmV0c21hbmFnZXIgIGFzIHNlY21hbn0gZnJvbSAnYXdzLWNkay1saWInOyBcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2F3c19zc20gYXMgc3NtIH0gZnJvbSAnYXdzLWNkay1saWInIFxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0IHsgQXNzZXQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtYXNzZXRzJztcbmltcG9ydCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGdlbmVyYXRvciA9IHJlcXVpcmUoJ2dlbmVyYXRlLXBhc3N3b3JkJyk7XG5cbmludGVyZmFjZSBJU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBzb2x1dGlvbk5hbWU6IHN0cmluZztcbiAgYXBwTmFtZTogc3RyaW5nOyAgXG4gIGFwcFBvcnQ6IG51bWJlcjtcbiAgZWMyS2V5TmFtZTogc3RyaW5nOyBcbiAgdGVzdGluZ0xvY2F0aW9uOiBzdHJpbmc7IFxuICBlbnZpcm9ubWVudDogc3RyaW5nOyBcbiAgY29zdGNlbnRlcjogc3RyaW5nOyBcbiAgZHRzdGFtcDogc3RyaW5nOyBcbn1cblxuXG5leHBvcnQgY2xhc3MgRUMyV2luZG93c1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQXBwLCBpZDogc3RyaW5nLCBwcm9wczogSVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAvL2hhcmRjb2RlZCBjcmVkZW50YWlscyBpbnRlbmRlZCBmb3IgVEVTVElORyBFTlZJUk9OTUVOVFMgb25seSBcbiAgY29uc3QgdXNlciA9IFwiZGVtb3VzZXJcIlxuICAvL2NvbnN0IHBhc3N3b3JkID0gXCJTdXBlclNlY3JldFB3ZDExISFcIlxuICB2YXIgcGFzc3dvcmQgPSBnZW5lcmF0b3IuZ2VuZXJhdGUoe1xuICAgIGxlbmd0aDogMTYsXG4gICAgbnVtYmVyczogdHJ1ZSxcbiAgICBleGNsdWRlOiBcIkDCoyQlJiooKSPigqxcIlxuICB9KTtcblxuICAvL1RhcmdldCBEZWZhdWx0IFZQQ1xuIC8vIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnaW1wb3J0IGRlZmF1bHQgdnBjJywgeyBpc0RlZmF1bHQ6IHRydWUgfSk7XG5cbiAgICAvL2ltcG9ydCB0aGUgVlBDIFxuICAgIGNvbnN0IHZwY0lkID0gc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZyb21Mb29rdXAodGhpcywgYC8ke3Byb3BzLnNvbHV0aW9uTmFtZX0vJHtwcm9wcy5lbnZpcm9ubWVudH0vdnBjSWRgKVxuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LWltcG9ydC12cGNgLCB7IHZwY0lkIH0pO1xuXG4gIC8vQ3JlYXRlIEluc3RhbmNlIFNlY3VyaXR5R3JvdXAgLVxuICBjb25zdCBzZXJ2ZXJTRyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnY3JlYXRlIHNlY3VyaXR5IGdyb3VwIGZvciBpbnN0YW5jZScsIHt2cGN9KTtcbiAgLy8gTk8gSU5CT1VORCBUUkFGRklDIEFMTE9XRUQgICAgXG4gIC8vIHVuY29tbWVudCB0byBhbGxvdyBwb3J0IHdlYiB0cmFmZmljIGluZ3Jlc3MgaW50byB3ZWIgc2VydmVyIHRyYWZmaWMgXG4gIC8vIHNlcnZlclNHLmFkZEluZ3Jlc3NSdWxlKCBlYzIuUGVlci5hbnlJcHY0KCksIGVjMi5Qb3J0LnRjcCgzMzg5KSwgJ2FsbG93IFJEUCB0cmFmZmljIGZyb20gYW55d2hlcmUnKVxuXG4gIC8vIHVuY29tbWVudCB0byBhbGxvdyBSRFAgVHJhZmZpYyBpbmdyZXNzIG92ZXIgdGhlIGludGVybmV0IGludG8gc2VydmVyIHRyYWZmaWNcbiAgIC8vc2VydmVyU0cuYWRkSW5ncmVzc1J1bGUoZWMyLlBlZXIuYW55SXB2NCgpLCBlYzIuUG9ydC50Y3AoODApLCAnYWxsb3cgSFRUUCB0cmFmZmljIGZyb20gYW55d2hlcmUnICk7IFxuXG5cblxuICAvL0NyZWF0ZSBlYzIgaW5zdGFuY2Ugcm9sZSBcbiAgY29uc3QgSW5zdGFuY2Vyb2xlID0gIG5ldyBpYW0uUm9sZSh0aGlzLCAnZWMyIGluc3RhbmNlIHJvbGUnLCBcbiAgICB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWMyLmFtYXpvbmF3cy5jb20nKSxcbiAgICAgIHJvbGVOYW1lOiBcIkVDMl9TU01fSW5zdGFuY2VfUm9sZVwiLFxuICAgICAgZGVzY3JpcHRpb246ICdTU00gSUFNIHJvbGUgaW4gQVdTIENESycsXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFxuICAgICAgICAgIFwiQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZVwiXG4gICAgICAgIClcbiAgICAgIF0sXG4gICAgfVxuICApXG5cbiAgLy8vKiAgQWRkIGlubGluZSBwb2xpY3kgdG8gcm9sZSBjcmVhdGVkIGFib3ZlICovXG4gIEluc3RhbmNlcm9sZS5hZGRUb1BvbGljeShcbiAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudChcbiAgICB7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXCJsb2dzOkRlc2NyaWJlTG9nR3JvdXBzXCIsIFwibG9nczpDcmVhdGVMb2dHcm91cFwiIF0sIFxuICAgICAgcmVzb3VyY2VzIDogW1wiKlwiXVxuICAgIH0pKTtcbiAgICBJbnN0YW5jZXJvbGUuYWRkVG9Qb2xpY3koXG4gICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoXG4gICAge1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcImxvZ3M6Q3JlYXRlTG9nU3RyZWFtXCIsIFwibG9nczpEZXNjcmliZUxvZ1N0cmVhbXNcIiwgXCJsb2dzOlB1dExvZ0V2ZW50c1wiIF0sIFxuICAgICAgICAvL3Jlc291cmNlcyA6IFtcImFybjphd3M6bG9nczoqOio6bG9nLWdyb3VwOi9hd3Mvc3lzdGVtTWFuYWdlci9TZXNzaW9uTWFuYWdlckxvZ3NcIiBdIC8vc3BlY2lmeSB3cml0ZSBvbmx5IHRvIHNwZWNpZmljIGxvZ0dyb3VwXG4gICAgICAgIHJlc291cmNlcyA6IFtcIipcIl1cbiAgICB9KSk7XG4gICAvLyBjb25zdCBidWNrZXROYW1lID0gc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZyb21Mb29rdXAodGhpcywgYC8ke3Byb3BzLnNvbHV0aW9uTmFtZX0vJHtwcm9wcy5lbnZpcm9ubWVudH0vczMvbmFtZWApXG4gIC8vIGNvbnN0IGFzc2V0QnVja2V0ID0gczMuQnVja2V0LmZyb21CdWNrZXROYW1lKHRoaXMsIFwiZ2V0QXNzZXRCdWNrXCIsIGJ1Y2tldE5hbWUpXG4gIC8vIGNvbnN0IGFzc2V0QnVja2V0ID0gczMuQnVja2V0LmZyb21CdWNrZXROYW1lKHRoaXMsIFwiTXlCdWNrZXRcIiwgc3NtLlN0cmluZ1BhcmFtZXRlci52YWx1ZUZvclN0cmluZ1BhcmFtZXRlcih0aGlzLCBgLyR7cHJvcHMuc29sdXRpb25OYW1lfS8ke3Byb3BzLmVudmlyb25tZW50fS9zMy9uYW1lYCkpXG4gICBcbiAgIEluc3RhbmNlcm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KFxuICAgICAge1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXCJzMzoqXCIgXSwgXG4gICAgICAgICAvLyByZXNvdXJjZXMgOiBbYXNzZXRCdWNrZXQuYnVja2V0QXJuIF0gLy9zcGVjaWZ5IHdyaXRlIG9ubHkgdG8gc3BlY2lmaWMgbG9nR3JvdXBcbiAgICAgICAgICByZXNvdXJjZXMgOiBbXCIqXCJdXG4gICAgICB9KSk7XG4gIFxuXG5cbiAgY29uc3QgYXNzZXQgPSBuZXcgQXNzZXQodGhpcywgJ0Fzc2V0Jywge1xuICAgIC8vcGF0aDogJy4vY29uZmlndXJlLnNoJ1xuICAgIC8vcGF0aDogXCIuL2Fzc2V0cy9kaXNrQmVuY2htYXJrL3dpbl9hcHBfYmVuY2htYXJrXzQwMDBmMi5leGVcIixcbiAgICBwYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4uL2Fzc2V0cy9kaXNrQmVuY2htYXJrL3dpbl9hcHBfYmVuY2htYXJrXzQwMDBmMi5leGVcIiksXG4gIH0pO1xuICBhc3NldC5ncmFudFJlYWQoSW5zdGFuY2Vyb2xlKTtcblxuXG4gIC8vQ29uZmlndXJlIFVzZXJEYXRhIFNjcmlwdHMgdG8gY3JlYXRlIGRlbW91c2VyIGFuZCBpbnN0YWxsIGJhc2Ugd2Vic2VydmVyXG4gIGNvbnN0IG11bHRpcGFydFVzZXJEYXRhID0gbmV3IGVjMi5NdWx0aXBhcnRVc2VyRGF0YVxuICBjb25zdCBjb21tYW5kc1VzZXJEYXRhID0gZWMyLlVzZXJEYXRhLmZvcldpbmRvd3MoKTsgXG4gIG11bHRpcGFydFVzZXJEYXRhLmFkZFVzZXJEYXRhUGFydChjb21tYW5kc1VzZXJEYXRhLCBNdWx0aXBhcnRCb2R5LlNIRUxMX1NDUklQVCk7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoYCR1c2VyPVwiJHt1c2VyfVwiYCk7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoYCRzZWN1cmVTdHJpbmcgPSBDb252ZXJ0VG8tU2VjdXJlU3RyaW5nIFwiJHtwYXNzd29yZH1cIiAtQXNQbGFpblRleHQgLUZvcmNlYCk7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJuZXctbG9jYWx1c2VyICR1c2VyIC1wYXNzd29yZCAgJHNlY3VyZVN0cmluZ1wiKTtcbiAgY29tbWFuZHNVc2VyRGF0YS5hZGRDb21tYW5kcyhcIkFkZC1Mb2NhbEdyb3VwTWVtYmVyIC1Hcm91cCBcXFwiQWRtaW5pc3RyYXRvcnNcXFwiIC1NZW1iZXIgJHVzZXJcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJHZXQtTG9jYWxVc2VyICR1c2VyIHwgc2VsZWN0ICpcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJpZXggKChuZXctb2JqZWN0IG5ldC53ZWJjbGllbnQpLkRvd25sb2FkU3RyaW5nKCdodHRwczovL2Nob2NvbGF0ZXkub3JnL2luc3RhbGwucHMxJykpXCIpO1xuICBjb21tYW5kc1VzZXJEYXRhLmFkZENvbW1hbmRzKFwiY2hvY28gaW5zdGFsbCBmaXJlZm94IC15XCIpOyBcbiAgY29tbWFuZHNVc2VyRGF0YS5hZGRDb21tYW5kcyhcImNob2NvIGluc3RhbGwgZ2l0IC15XCIpO1xuICBjb21tYW5kc1VzZXJEYXRhLmFkZENvbW1hbmRzKFwiJGVudjpQYXRoICs9ICc7QzpcXFxcUHJvZ3JhbSBGaWxlc1xcXFxHaXRcXFxcY21kJyBcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJjZCBjOlxcXFxcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJta2RpciBzcmNcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJjZCBzcmNcIik7XG4gICAvL2Rvd2xvYWQgZ2l0aHViIGFydGlmYWN0c1xuICBjb21tYW5kc1VzZXJEYXRhLmFkZENvbW1hbmRzKFwiZ2l0IGNsb25lIGh0dHBzOi8vZ2l0aHViLmNvbS9hd3MtcXVpY2tzdGFydC9xdWlja3N0YXJ0LWxpbnV4LXV0aWxpdGllcy5naXRcIik7XG4gIGNvbW1hbmRzVXNlckRhdGEuYWRkQ29tbWFuZHMoXCJnaXQgY2xvbmUgaHR0cHM6Ly9naXRodWIuY29tL3ZhdWdobmdpdC9hd3MtY2RrLmdpdFwiKTtcbiAgLy9jb21tYW5kc1VzZXJEYXRhLmFkZFMzRG93bmxvYWRDb21tYW5kKHtidWNrZXQ6IGFzc2V0QnVja2V0LCBidWNrZXRLZXk6IFwic29mdHdhcmUvYmVuY2htYXJrL3dpbl9hcHBfYmVuY2htYXJrXzQwMDBmMi5leGVcIiB9KVxuICBjb21tYW5kc1VzZXJEYXRhLmFkZFMzRG93bmxvYWRDb21tYW5kKHtidWNrZXQ6IGFzc2V0LmJ1Y2tldCwgYnVja2V0S2V5OiBhc3NldC5zM09iamVjdEtleSB9KVxuICBjb21tYW5kc1VzZXJEYXRhLmFkZENvbW1hbmRzKFwiY2QgYXdzLWNka1wiKTtcblxuICAvLyB1bmNvbW1lbnQgdG8gaW5zdGFsbCBJSVMgd2Vic2VydmVyIFxuICAvLyBjb21tYW5kc1VzZXJEYXRhLmFkZENvbW1hbmRzKFwiSW5zdGFsbC1XaW5kb3dzRmVhdHVyZSAtbmFtZSBXZWItU2VydmVyIC1JbmNsdWRlTWFuYWdlbWVudFRvb2xzXCIpO1xuXG4gIGNvbnN0IHJvb3RWb2x1bWU6IGVjMi5CbG9ja0RldmljZSA9IHtcbiAgICBkZXZpY2VOYW1lOiAnL2Rldi9zZGExJywgLy8gVXNlIHRoZSByb290IGRldmljZSBuYW1lIGZyb20gU3RlcCAxXG4gICAgLy92b2x1bWU6IGVjMi5CbG9ja0RldmljZVZvbHVtZS5lYnMoNTApLCAvLyBPdmVycmlkZSB0aGUgdm9sdW1lIHNpemUgaW4gR2liaWJ5dGVzIChHaUIpXG4gICAgdm9sdW1lOiBlYzIuQmxvY2tEZXZpY2VWb2x1bWUuZWJzKDUwMClcbiAgfTtcblxuXG4gIC8vQ3JlYXRlIEVDMiBJbnN0YW5jZTogXG4gICAgY29uc3QgZWMySW5zdGFuY2UgPSBuZXcgZWMyLkluc3RhbmNlKHRoaXMsICdlYzItaW5zdGFuY2UnLCB7XG4gICAgICB2cGMsXG4gICAgICByb2xlOiBJbnN0YW5jZXJvbGUsXG4gICAgICBzZWN1cml0eUdyb3VwOiBzZXJ2ZXJTRyxcbiAgICAgIGtleU5hbWU6IHByb3BzLmVjMktleU5hbWUsIFxuICAgICAgYmxvY2tEZXZpY2VzOiBbcm9vdFZvbHVtZV0sXG4gICAgICB2cGNTdWJuZXRzOiB7XG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9OQVQsXG4gICAgICB9LFxuICAgICAgbWFjaGluZUltYWdlOiBuZXcgZWMyLldpbmRvd3NJbWFnZShXaW5kb3dzVmVyc2lvbi5XSU5ET1dTX1NFUlZFUl8yMDIyX0VOR0xJU0hfRlVMTF9CQVNFKSxcbiAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihcbiAgICAgICAgZWMyLkluc3RhbmNlQ2xhc3MuVDNBLFxuICAgICAgICBlYzIuSW5zdGFuY2VTaXplLk1FRElVTSxcbiAgICAgICksXG4gICAgIC8vIGluc3RhbmNlTmFtZTogXCJUZXN0V2luZG93SW5zdGFuY2UtanMtY2RrXCIsXG4gICAgICB1c2VyRGF0YTogY29tbWFuZHNVc2VyRGF0YVxuICAgIH0pO1xuXG5cbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcIk5hbWVcIiwgcHJvcHMuYXBwTmFtZSlcbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcImFwcE5hbWVcIiwgcHJvcHMuYXBwTmFtZSlcbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcInNvbHV0aW9uXCIsIHByb3BzLnNvbHV0aW9uTmFtZSlcbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcImVudmlyb25tZW50XCIsIHByb3BzLmVudmlyb25tZW50KVxuICAgIFRhZ3Mub2YodGhpcykuYWRkKFwiY29zdGNlbnRlclwiLCBwcm9wcy5jb3N0Y2VudGVyKVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ3VzZXJuYW1lJywge3ZhbHVlOnVzZXIgfSlcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAncGFzc3dvcmQnLCB7dmFsdWU6IHBhc3N3b3JkfSkgXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0luc3RhbmNlSWQnLCB7dmFsdWU6IGVjMkluc3RhbmNlLmluc3RhbmNlSWR9KVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdJbnN0YW5jZVByaXZhdGVEbnNOYW1lJywge3ZhbHVlOiBlYzJJbnN0YW5jZS5pbnN0YW5jZVByaXZhdGVEbnNOYW1lfSlcblxuICB9XG4gIFxufVxuIl19