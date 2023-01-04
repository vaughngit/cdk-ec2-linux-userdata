"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3RepoStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const kms = require("aws-cdk-lib/aws-kms");
const aws_cdk_lib_3 = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
class S3RepoStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const encryptionKey = new kms.Key(this, 'Key', {
            alias: `${props.solutionName}/${props.environment}/encryptionkey`,
            enableKeyRotation: true,
            enabled: true,
            policy: new aws_cdk_lib_2.aws_iam.PolicyDocument({
                assignSids: true,
                statements: [
                    new aws_cdk_lib_2.aws_iam.PolicyStatement({
                        effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
                        principals: [
                            new aws_cdk_lib_2.aws_iam.AccountRootPrincipal()
                        ],
                        actions: ['kms:*'],
                        resources: [`*`],
                    }),
                    new aws_cdk_lib_2.aws_iam.PolicyStatement({
                        effect: aws_cdk_lib_2.aws_iam.Effect.ALLOW,
                        principals: [
                            // GlueCrawlerPermissions,
                            //new iam.ArnPrincipal(`arn:${this.partition}:iam::${this.account}:role/service-role/aws-quicksight-service-role-v0`)
                            new aws_cdk_lib_2.aws_iam.ArnPrincipal(`arn:${this.partition}:iam::${this.account}:role/EC2_SSM_Instance_Role`)
                        ],
                        actions: ['kms:Decrypt'],
                        resources: [`*`],
                    })
                ]
            })
        });
        const assetBucket = new s3.Bucket(this, 'DownloadsBucket', {
            bucketName: `${props.appName}-${this.account}-${this.region}-downloads`,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
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
                    abortIncompleteMultipartUploadAfter: aws_cdk_lib_1.Duration.days(30),
                    expiration: aws_cdk_lib_1.Duration.days(365),
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: aws_cdk_lib_1.Duration.days(30),
                        },
                        {
                            storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                            transitionAfter: aws_cdk_lib_1.Duration.days(60),
                        },
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: aws_cdk_lib_1.Duration.days(90),
                        },
                        {
                            storageClass: s3.StorageClass.DEEP_ARCHIVE,
                            transitionAfter: aws_cdk_lib_1.Duration.days(180),
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
        new aws_cdk_lib_3.aws_ssm.StringParameter(this, 'bucket name ssm param', {
            parameterName: `/${props.solutionName}/${props.environment}/s3/name`,
            stringValue: assetBucket.bucketName,
            description: `param for ${props.solutionName} assets bucket`,
            type: aws_cdk_lib_3.aws_ssm.ParameterType.STRING,
            tier: aws_cdk_lib_3.aws_ssm.ParameterTier.INTELLIGENT_TIERING,
            allowedPattern: '.*',
        });
        aws_cdk_lib_1.Tags.of(this).add("appName", props.appName);
        aws_cdk_lib_1.Tags.of(this).add("solution", props.solutionName);
        aws_cdk_lib_1.Tags.of(this).add("environment", props.environment);
        aws_cdk_lib_1.Tags.of(this).add("costcenter", props.costcenter);
    }
}
exports.S3RepoStack = S3RepoStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtcmVwby1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInMzLXJlcG8tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQWlLO0FBRWpLLDZDQUEyQztBQUMzQywyQ0FBMkM7QUFHM0MsNkNBQTJDO0FBQzNDLHlDQUF3QztBQUV4QywwREFBeUQ7QUFVekQsTUFBYSxXQUFZLFNBQVEsbUJBQUs7SUFDcEMsWUFBWSxLQUFVLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3BELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBR3hCLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFO1lBQzdDLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLFdBQVcsZ0JBQWdCO1lBQ2pFLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsT0FBTyxFQUFFLElBQUk7WUFDYixNQUFNLEVBQUUsSUFBSSxxQkFBRyxDQUFDLGNBQWMsQ0FBQztnQkFDN0IsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFVBQVUsRUFBRTtvQkFDUixJQUFJLHFCQUFHLENBQUMsZUFBZSxDQUFFO3dCQUN6QixNQUFNLEVBQUUscUJBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSzt3QkFDeEIsVUFBVSxFQUFFOzRCQUNWLElBQUkscUJBQUcsQ0FBQyxvQkFBb0IsRUFBRTt5QkFDL0I7d0JBQ0QsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDO3dCQUNsQixTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7cUJBQ2pCLENBQUM7b0JBQ0YsSUFBSSxxQkFBRyxDQUFDLGVBQWUsQ0FBRTt3QkFDdkIsTUFBTSxFQUFFLHFCQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7d0JBQ3hCLFVBQVUsRUFBRTs0QkFDWCwwQkFBMEI7NEJBQ3pCLHFIQUFxSDs0QkFDckgsSUFBSSxxQkFB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QUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNqRCxrQkFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNuRCxrQkFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUVuRCxDQUFDO0NBRUY7QUFqR0Qsa0NBaUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtBcHAsIENmbk91dHB1dCwgQ2ZuUGFyYW1ldGVyLCBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSwgU2VjcmV0VmFsdWUsIFN0YWNrLCBTdGFja1Byb3BzLCBUYWdzLCBjdXN0b21fcmVzb3VyY2VzIGFzIGNyLCBDdXN0b21SZXNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHthd3NfaWFtIGFzIGlhbSB9ZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0IHthd3Nfc2VjcmV0c21hbmFnZXIgIGFzIHNlY21hbn0gZnJvbSAnYXdzLWNkay1saWInOyBcbmltcG9ydCB7cmVhZEZpbGVTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQge2F3c19zc20gYXMgc3NtIH0gZnJvbSAnYXdzLWNkay1saWInIFxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xuaW1wb3J0ICogYXMgczNuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zJ1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnXG5cbmludGVyZmFjZSBJU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBzb2x1dGlvbk5hbWU6IHN0cmluZztcbiAgYXBwTmFtZTogc3RyaW5nOyBcbiAgZW52aXJvbm1lbnQ6IHN0cmluZzsgXG4gIGNvc3RjZW50ZXI6IHN0cmluZzsgXG59XG5cblxuZXhwb3J0IGNsYXNzIFMzUmVwb1N0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQXBwLCBpZDogc3RyaW5nLCBwcm9wczogSVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICBcbiAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ0tleScsIHtcbiAgICAgIGFsaWFzOiBgJHtwcm9wcy5zb2x1dGlvbk5hbWV9LyR7cHJvcHMuZW52aXJvbm1lbnR9L2VuY3J5cHRpb25rZXlgLFxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgICBlbmFibGVkOiB0cnVlLCBcbiAgICAgIHBvbGljeTogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgIGFzc2lnblNpZHM6IHRydWUsIFxuICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCAoe1xuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgcHJpbmNpcGFsczogW1xuICAgICAgICAgICAgICBuZXcgaWFtLkFjY291bnRSb290UHJpbmNpcGFsKClcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhY3Rpb25zOiBbJ2ttczoqJ10sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtgKmBdLFxuICAgICAgICAgIH0pLFxuICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50ICh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBwcmluY2lwYWxzOiBbXG4gICAgICAgICAgICAgLy8gR2x1ZUNyYXdsZXJQZXJtaXNzaW9ucyxcbiAgICAgICAgICAgICAgLy9uZXcgaWFtLkFyblByaW5jaXBhbChgYXJuOiR7dGhpcy5wYXJ0aXRpb259OmlhbTo6JHt0aGlzLmFjY291bnR9OnJvbGUvc2VydmljZS1yb2xlL2F3cy1xdWlja3NpZ2h0LXNlcnZpY2Utcm9sZS12MGApXG4gICAgICAgICAgICAgIG5ldyBpYW0uQXJuUHJpbmNpcGFsKGBhcm46JHt0aGlzLnBhcnRpdGlvbn06aWFtOjoke3RoaXMuYWNjb3VudH06cm9sZS9FQzJfU1NNX0luc3RhbmNlX1JvbGVgKVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFjdGlvbnM6IFsna21zOkRlY3J5cHQnXSxcbiAgICAgICAgICAgIHJlc291cmNlczogW2AqYF0sXG4gICAgICAgICAgfSlcbiAgICAgICAgXVxuICAgICAgfSlcbiAgICB9KVxuXG5cbiAgICBjb25zdCBhc3NldEJ1Y2tldCA9ICAgbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRG93bmxvYWRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tJHt0aGlzLmFjY291bnR9LSR7dGhpcy5yZWdpb259LWRvd25sb2Fkc2AsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBldmVudEJyaWRnZUVuYWJsZWQ6IHRydWUsXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSwgXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsIFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCwgXG4gICAgIC8vIG5vdGlmaWNhdGlvbnNIYW5kbGVyUm9sZTogUm9sZUZvclMzVG9JbnZva2VMYW1iZGEsIFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVMsXG4gICAgICBlbmNyeXB0aW9uS2V5OiBlbmNyeXB0aW9uS2V5LCBcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICAvLyDwn5GHIG9wdGlvbmFsbHkgYXBwbHkgb2JqZWN0IG5hbWUgZmlsdGVyaW5nXG4gICAgICAgICAgLy8gcHJlZml4OiAnZGF0YS8nLFxuICAgICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBEdXJhdGlvbi5kYXlzKDMwKSxcbiAgICAgICAgICBleHBpcmF0aW9uOiBEdXJhdGlvbi5kYXlzKDM2NSksXG4gICAgICAgICAgdHJhbnNpdGlvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cygzMCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTlRFTExJR0VOVF9USUVSSU5HLFxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoNjApLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUixcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDkwKSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkRFRVBfQVJDSElWRSxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDE4MCksXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gICAgLy9Ud2l0dGVyQnVja2V0LmFkZEV2ZW50Tm90aWZpY2F0aW9uKHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCwgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbihMYW1iZGFUd2l0dGVyUGFyc2VyKSwgIHsgcHJlZml4OiBcInJhd190d2VldHMvXCIgfSApXG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCBcIkRlcGxveUJlbmNobWFya2luZ1NvZnR3YXJlXCIsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoXCIuL2Fzc2V0cy9kaXNrQmVuY2htYXJrXCIpXSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBhc3NldEJ1Y2tldCxcbiAgICAgIGRlc3RpbmF0aW9uS2V5UHJlZml4OiBcInNvZnR3YXJlL2JlbmNobWFya1wiLCAvLyBvcHRpb25hbCBwcmVmaXggaW4gZGVzdGluYXRpb24gYnVja2V0XG4gICAgfSk7XG4gXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ2J1Y2tldCBuYW1lIHNzbSBwYXJhbScsIHtcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAvJHtwcm9wcy5zb2x1dGlvbk5hbWV9LyR7cHJvcHMuZW52aXJvbm1lbnR9L3MzL25hbWVgLFxuICAgICAgc3RyaW5nVmFsdWU6IGFzc2V0QnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogYHBhcmFtIGZvciAke3Byb3BzLnNvbHV0aW9uTmFtZX0gYXNzZXRzIGJ1Y2tldGAsXG4gICAgICB0eXBlOiBzc20uUGFyYW1ldGVyVHlwZS5TVFJJTkcsXG4gICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5JTlRFTExJR0VOVF9USUVSSU5HLFxuICAgICAgYWxsb3dlZFBhdHRlcm46ICcuKicsXG4gICAgfSk7XG5cblxuICAgIFRhZ3Mub2YodGhpcykuYWRkKFwiYXBwTmFtZVwiLCBwcm9wcy5hcHBOYW1lKVxuICAgIFRhZ3Mub2YodGhpcykuYWRkKFwic29sdXRpb25cIiwgcHJvcHMuc29sdXRpb25OYW1lKVxuICAgIFRhZ3Mub2YodGhpcykuYWRkKFwiZW52aXJvbm1lbnRcIiwgcHJvcHMuZW52aXJvbm1lbnQpXG4gICAgVGFncy5vZih0aGlzKS5hZGQoXCJjb3N0Y2VudGVyXCIsIHByb3BzLmNvc3RjZW50ZXIpXG5cbiAgfVxuICBcbn1cbiJdfQ==