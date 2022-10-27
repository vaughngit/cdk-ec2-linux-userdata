import {App, CfnOutput, CfnParameter, Duration, RemovalPolicy, SecretValue, Stack, StackProps, Tags, custom_resources as cr, CustomResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {aws_iam as iam }from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import {aws_secretsmanager  as secman} from 'aws-cdk-lib'; 
import {readFileSync} from 'fs';
import {aws_ssm as ssm } from 'aws-cdk-lib' 
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'

interface IStackProps extends StackProps {
  solutionName: string;
  appName: string; 
  environment: string; 
  costcenter: string; 
}


export class S3RepoStack extends Stack {
  constructor(scope: App, id: string, props: IStackProps) {
    super(scope, id, props);

     
    const encryptionKey = new kms.Key(this, 'Key', {
      alias: `${props.solutionName}/${props.environment}/encryptionkey`,
      enableKeyRotation: true,
      enabled: true, 
      policy: new iam.PolicyDocument({
        assignSids: true, 
        statements: [
            new iam.PolicyStatement ({
            effect: iam.Effect.ALLOW,
            principals: [
              new iam.AccountRootPrincipal()
            ],
            actions: ['kms:*'],
            resources: [`*`],
          }),
          new iam.PolicyStatement ({
            effect: iam.Effect.ALLOW,
            principals: [
             // GlueCrawlerPermissions,
              //new iam.ArnPrincipal(`arn:${this.partition}:iam::${this.account}:role/service-role/aws-quicksight-service-role-v0`)
              new iam.ArnPrincipal(`arn:${this.partition}:iam::${this.account}:role/EC2_SSM_Instance_Role`)
            ],
            actions: ['kms:Decrypt'],
            resources: [`*`],
          })
        ]
      })
    })


    const assetBucket =   new s3.Bucket(this, 'DownloadsBucket', {
      bucketName: `${props.appName}-${this.account}-${this.region}-downloads`,
      removalPolicy: RemovalPolicy.DESTROY,
      eventBridgeEnabled: true,
      autoDeleteObjects: true, 
      versioned: true, 
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, 
     // notificationsHandlerRole: RoleForS3ToInvokeLambda, 
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: encryptionKey, 
      lifecycleRules: [
        {
          // 👇 optionally apply object name filtering
          // prefix: 'data/',
          abortIncompleteMultipartUploadAfter: Duration.days(30),
          expiration: Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: Duration.days(60),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: Duration.days(180),
            }
          ],
        },
      ],
    });
    //TwitterBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(LambdaTwitterParser),  { prefix: "raw_tweets/" } )

    new s3deploy.BucketDeployment(this, "DeployBenchmarkingSoftware", {
      sources: [s3deploy.Source.asset("./assets/diskBenchmark")],
      destinationBucket: assetBucket,
      destinationKeyPrefix: "software/benchmark", // optional prefix in destination bucket
    });
 
    new ssm.StringParameter(this, 'bucket name ssm param', {
      parameterName: `/${props.solutionName}/${props.environment}/s3/name`,
      stringValue: assetBucket.bucketName,
      description: `param for ${props.solutionName} assets bucket`,
      type: ssm.ParameterType.STRING,
      tier: ssm.ParameterTier.INTELLIGENT_TIERING,
      allowedPattern: '.*',
    });


    Tags.of(this).add("appName", props.appName)
    Tags.of(this).add("solution", props.solutionName)
    Tags.of(this).add("environment", props.environment)
    Tags.of(this).add("costcenter", props.costcenter)

  }
  
}
