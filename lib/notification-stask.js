"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const sns = require("aws-cdk-lib/aws-sns");
const subs = require("aws-cdk-lib/aws-sns-subscriptions");
const sqs = require("aws-cdk-lib/aws-sqs");
const cdk = require("aws-cdk-lib");
const path = require("path");
class NotificationStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // 👇 create dead letter sqs queue
        const deadLetterQueue = new sqs.Queue(this, 'dead-letter-queue', {
            retentionPeriod: aws_cdk_lib_1.Duration.minutes(30),
            queueName: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq`,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY
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
        const dlqLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'dlq-lambda', {
            functionName: `${props.solutionName}-${props.serviceName}-${props.environment}-dlq-function`,
            description: `${props.solutionName} ${props.serviceName} ${props.environment} dlq function`,
            role: DQLFunctionRole,
            memorySize: 1024,
            timeout: aws_cdk_lib_1.Duration.seconds(5),
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'main',
            entry: path.join(__dirname, `/../lambdaCode/dlq-lambda/index.ts`),
        });
        // 👇 add dead letter queue as event source for dlq lambda function
        dlqLambda.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(deadLetterQueue));
        // 👇 create topic queue
        const topicQueue = new sqs.Queue(this, 'sns topic sqs-queue', {
            queueName: `${props.solutionName}-${props.serviceName}-${props.environment}-sns-que`,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            deadLetterQueue: {
                queue: deadLetterQueue,
                maxReceiveCount: 1,
            },
        });
        // 👇 create sns topic
        const snsTopic = new sns.Topic(this, 'sns-topic', {
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
        const notificationLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'notification-lambda', {
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
        notificationLambda.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(topicQueue, {
            batchSize: 10,
        }));
        new cdk.CfnOutput(this, 'snsTopicArn', {
            exportName: `${props.solutionName}-${props.environment}-${this.region}-sns-topic-arn`,
            value: snsTopic.topicArn,
            description: 'The arn of the SNS topic',
        });
        aws_cdk_lib_1.Tags.of(this).add("service", `${props.serviceName}`, {
            includeResourceTypes: []
        });
        aws_cdk_lib_1.Tags.of(this).add("environment", props.environment);
        aws_cdk_lib_1.Tags.of(this).add("solution", props.solutionName);
        aws_cdk_lib_1.Tags.of(this).add("costcenter", props.costcenter);
    }
}
exports.NotificationStack = NotificationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXN0YXNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibm90aWZpY2F0aW9uLXN0YXNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDZDQUErRTtBQUMvRSxpREFBaUQ7QUFDakQsMkNBQTJDO0FBQzNDLG1GQUFvRTtBQUNwRSxxRUFBNkQ7QUFDN0QsMkNBQTJDO0FBQzNDLDBEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQVM3QixNQUFhLGlCQUFrQixTQUFRLG1CQUFLO0lBQzFDLFlBQVksS0FBYyxFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN0RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixrQ0FBa0M7UUFDbEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUM3RCxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3JDLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsV0FBVyxNQUFNO1lBQ2hGLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87U0FDdkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN6RCxRQUFRLEVBQUUsR0FBRyxLQUFLLENBQUMsWUFBWSxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFdBQVcsMEJBQTBCLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDaEgsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQyxXQUFXLHdCQUF3QjtZQUNwRyxTQUFTLEVBQUUsSUFBSSxH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Q0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2pELGtCQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBRW5ELENBQUM7Q0FDRjtBQWxHRCw4Q0FrR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzLCBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSwgVGFncyB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7U3FzRXZlbnRTb3VyY2V9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlcyc7XG5pbXBvcnQge05vZGVqc0Z1bmN0aW9ufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBzdWJzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMtc3Vic2NyaXB0aW9ucyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBJaW5mcmFzdHJ1Y3R1cmVTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wc3tcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nOyBcbiAgICBzb2x1dGlvbk5hbWU6IHN0cmluZzsgXG4gICAgc2VydmljZU5hbWU6IHN0cmluZzsgXG4gICAgY29zdGNlbnRlcjogc3RyaW5nOyBcbiAgfVxuXG5leHBvcnQgY2xhc3MgTm90aWZpY2F0aW9uU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wczogSWluZnJhc3RydWN0dXJlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8g8J+RhyBjcmVhdGUgZGVhZCBsZXR0ZXIgc3FzIHF1ZXVlXG4gICAgY29uc3QgZGVhZExldHRlclF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnZGVhZC1sZXR0ZXItcXVldWUnLCB7XG4gICAgICAgIHJldGVudGlvblBlcmlvZDogRHVyYXRpb24ubWludXRlcygzMCksXG4gICAgICAgIHF1ZXVlTmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS0ke3Byb3BzLnNlcnZpY2VOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1kbHFgLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1lcbiAgICB9KTtcblxuICAgIGNvbnN0IERRTEZ1bmN0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBgRFFMLUxhbWJkYVJvbGVgLCB7XG4gICAgICAgIHJvbGVOYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LSR7cHJvcHMuc2VydmljZU5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LWRscS1mdW5jdGlvbi1pYW0tcm9sZS0ke3RoaXMucmVnaW9ufWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LSR7cHJvcHMuc2VydmljZU5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LWRscS1mdW5jdGlvbi1pYW0tcm9sZWAsXG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJzZXJ2aWNlLXJvbGUvQVdTTGFtYmRhQmFzaWNFeGVjdXRpb25Sb2xlXCIpXG4gICAgICAgIF1cbiAgICAgIH0pO1xuXG4gICAgLy8g8J+RhyBjcmVhdGUgRExRIGxhbWJkYSBmdW5jdGlvblxuICAgIGNvbnN0IGRscUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnZGxxLWxhbWJkYScsIHtcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LSR7cHJvcHMuc2VydmljZU5hbWV9LSR7cHJvcHMuZW52aXJvbm1lbnR9LWRscS1mdW5jdGlvbmAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9ICR7cHJvcHMuc2VydmljZU5hbWV9ICR7cHJvcHMuZW52aXJvbm1lbnR9IGRscSBmdW5jdGlvbmAsXG4gICAgICAgIHJvbGU6IERRTEZ1bmN0aW9uUm9sZSxcbiAgICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcbiAgICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICAgIGhhbmRsZXI6ICdtYWluJyxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsIGAvLi4vbGFtYmRhQ29kZS9kbHEtbGFtYmRhL2luZGV4LnRzYCksXG4gICAgfSk7XG5cblxuICAgIC8vIPCfkYcgYWRkIGRlYWQgbGV0dGVyIHF1ZXVlIGFzIGV2ZW50IHNvdXJjZSBmb3IgZGxxIGxhbWJkYSBmdW5jdGlvblxuICAgIGRscUxhbWJkYS5hZGRFdmVudFNvdXJjZShuZXcgU3FzRXZlbnRTb3VyY2UoZGVhZExldHRlclF1ZXVlKSk7XG5cblxuICAgIC8vIPCfkYcgY3JlYXRlIHRvcGljIHF1ZXVlXG4gICAgY29uc3QgdG9waWNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ3NucyB0b3BpYyBzcXMtcXVldWUnLCB7XG4gICAgICAgIHF1ZXVlTmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS0ke3Byb3BzLnNlcnZpY2VOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1zbnMtcXVlYCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgICAgIHF1ZXVlOiBkZWFkTGV0dGVyUXVldWUsXG4gICAgICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDEsXG4gICAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyDwn5GHIGNyZWF0ZSBzbnMgdG9waWNcbiAgICBjb25zdCBzbnNUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ3Nucy10b3BpYycse1xuICAgICAgICBkaXNwbGF5TmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS0ke3Byb3BzLnNlcnZpY2VOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1zbnMtdG9waWNgLFxuICAgICAgICB0b3BpY05hbWU6IGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tJHtwcm9wcy5zZXJ2aWNlTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tc25zLXRvcGljYCxcbiAgICB9KTtcblxuICAgIC8vIPCfkYcgc3Vic2NyaWJlIHF1ZXVlIHRvIHRvcGljXG4gICAgc25zVG9waWMuYWRkU3Vic2NyaXB0aW9uKG5ldyBzdWJzLlNxc1N1YnNjcmlwdGlvbih0b3BpY1F1ZXVlKSk7XG5cbiAgICBjb25zdCBzbnNMYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIGBTTlMtTGFtYmRhUm9sZWAsIHtcbiAgICAgICAgcm9sZU5hbWU6IGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tJHtwcm9wcy5zZXJ2aWNlTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tc25zLWZ1bmN0aW9uLWlhbS1yb2xlLSR7dGhpcy5yZWdpb259YCxcbiAgICAgICAgZGVzY3JpcHRpb246IGAke3Byb3BzLnNvbHV0aW9uTmFtZX0tJHtwcm9wcy5zZXJ2aWNlTmFtZX0tJHtwcm9wcy5lbnZpcm9ubWVudH0tc25zLWZ1bmN0aW9uLWlhbS1yb2xlYCxcbiAgICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXG4gICAgICAgIG1hbmFnZWRQb2xpY2llczogW1xuICAgICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcInNlcnZpY2Utcm9sZS9BV1NMYW1iZGFCYXNpY0V4ZWN1dGlvblJvbGVcIilcbiAgICAgICAgXVxuICAgICAgfSk7XG5cbiAgICAvLyDwn5GHIGNyZWF0ZSBsYW1iZGEgZnVuY3Rpb25cbiAgICBjb25zdCBub3RpZmljYXRpb25MYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ25vdGlmaWNhdGlvbi1sYW1iZGEnLCB7XG4gICAgICAgIGZ1bmN0aW9uTmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS0ke3Byb3BzLnNlcnZpY2VOYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS1zbnMtZnVuY3Rpb25gLFxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7cHJvcHMuc29sdXRpb25OYW1lfSAke3Byb3BzLnNlcnZpY2VOYW1lfSAke3Byb3BzLmVudmlyb25tZW50fSBzbnMgZnVuY3Rpb25gLFxuICAgICAgICByb2xlOiBzbnNMYW1iZGFSb2xlLFxuICAgICAgICBtZW1vcnlTaXplOiAxMDI0LFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICAgIGhhbmRsZXI6ICdtYWluJyxcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsIGAvLi4vbGFtYmRhQ29kZS9ub3RpZmljYXRpb24tbGFtYmRhL2luZGV4LnRzYCksXG4gICAgfSk7XG5cbiAgICAvLyDwn5GHIGFkZCBzcXMgcXVldWUgYXMgZXZlbnQgc291cmNlIGZvciBMYW1iZGFcbiAgICBub3RpZmljYXRpb25MYW1iZGEuYWRkRXZlbnRTb3VyY2UoXG4gICAgICBuZXcgU3FzRXZlbnRTb3VyY2UodG9waWNRdWV1ZSwge1xuICAgICAgICBiYXRjaFNpemU6IDEwLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdzbnNUb3BpY0FybicsIHtcbiAgICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuc29sdXRpb25OYW1lfS0ke3Byb3BzLmVudmlyb25tZW50fS0ke3RoaXMucmVnaW9ufS1zbnMtdG9waWMtYXJuYCxcbiAgICAgICAgdmFsdWU6IHNuc1RvcGljLnRvcGljQXJuLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhcm4gb2YgdGhlIFNOUyB0b3BpYycsXG4gICAgfSk7XG5cbiAgICBUYWdzLm9mKHRoaXMpLmFkZChcInNlcnZpY2VcIiwgYCR7cHJvcHMuc2VydmljZU5hbWV9YCx7XG4gICAgICBpbmNsdWRlUmVzb3VyY2VUeXBlczogW11cbiAgICB9KVxuICAgIFRhZ3Mub2YodGhpcykuYWRkKFwiZW52aXJvbm1lbnRcIiwgcHJvcHMuZW52aXJvbm1lbnQpXG4gICAgVGFncy5vZih0aGlzKS5hZGQoXCJzb2x1dGlvblwiLCBwcm9wcy5zb2x1dGlvbk5hbWUpXG4gICAgVGFncy5vZih0aGlzKS5hZGQoXCJjb3N0Y2VudGVyXCIsIHByb3BzLmNvc3RjZW50ZXIpXG5cbiAgfVxufSJdfQ==