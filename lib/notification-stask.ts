import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';

export interface IinfrastructureStackProps extends StackProps{
    environment: string; 
    solutionName: string; 
    serviceName: string; 
    costcenter: string; 
  }

export class NotificationStack extends Stack {
  constructor(scope: cdk.App, id: string, props: IinfrastructureStackProps) {
    super(scope, id, props);

    // 👇 create dead letter sqs queue
    const deadLetterQueue = new sqs.Queue(this, 'dead-letter-queue', {
        retentionPeriod: Duration.minutes(30),
        queueName: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq`,
        removalPolicy: RemovalPolicy.DESTROY
    });

    const DQLFunctionRole = new iam.Role(this, `DQL-LambdaRole`, {
        roleName: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq-function-iam-role-${this.region}`,
        description: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq-function-iam-role`,
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
        ]
      });

    // 👇 create DLQ lambda function
    const dlqLambda = new NodejsFunction(this, 'dlq-lambda', {
        functionName: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq-function`,
        description: `${props.solutionName} ${props.serviceName} ${props.environment} dlq function`,
        role: DQLFunctionRole,
        memorySize: 1024,
        timeout: Duration.seconds(5),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'main',
        entry: path.join(__dirname, `/../lambdaCode/dlq-lambda/index.ts`),
    });


    // 👇 add dead letter queue as event source for dlq lambda function
    dlqLambda.addEventSource(new SqsEventSource(deadLetterQueue));


    // 👇 create topic queue
    const topicQueue = new sqs.Queue(this, 'sns topic sqs-queue', {
        queueName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-que`,
        removalPolicy: RemovalPolicy.DESTROY,
        deadLetterQueue: {
            queue: deadLetterQueue,
            maxReceiveCount: 1,
        },
    });

    // 👇 create sns topic
    const snsTopic = new sns.Topic(this, 'sns-topic',{
        displayName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-topic`,
        topicName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-topic`,
    });

    // 👇 subscribe queue to topic
    snsTopic.addSubscription(new subs.SqsSubscription(topicQueue));

    const snsLambdaRole = new iam.Role(this, `SNS-LambdaRole`, {
        roleName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-function-iam-role-${this.region}`,
        description: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-function-iam-role`,
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
        ]
      });

    // 👇 create lambda function
    const notificationLambda = new NodejsFunction(this, 'notification-lambda', {
        functionName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-function`,
        description: `${props.solutionName} ${props.serviceName} ${props.environment} sns function`,
        role: snsLambdaRole,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        runtime: lambda.Runtime.NODEJS_14_X,
        handler: 'main',
        entry: path.join(__dirname, `/../lambdaCode/notification-lambda/index.ts`),
    });

    // 👇 add sqs queue as event source for Lambda
    notificationLambda.addEventSource(
      new SqsEventSource(topicQueue, {
        batchSize: 10,
      }),
    );

    new cdk.CfnOutput(this, 'snsTopicArn', {
        exportName: `${props.solutionName}-${props.environment}-${this.region}-sns-topic-arn`,
        value: snsTopic.topicArn,
        description: 'The arn of the SNS topic',
    });

    Tags.of(this).add("service", `${props.serviceName}`,{
      includeResourceTypes: []
    })
    Tags.of(this).add("environment", props.environment)
    Tags.of(this).add("solution", props.solutionName)
    Tags.of(this).add("costcenter", props.costcenter)

  }
}