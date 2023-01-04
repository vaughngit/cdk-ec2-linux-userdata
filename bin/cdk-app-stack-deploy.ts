//import * as cdk from '@aws-cdk/core';
//import {App, Stack, Construct, Tags, StackProps} from '@aws-cdk/core';
import {Tags, App}from 'aws-cdk-lib';
import {EC2DeployStack} from '../lib/ec2-linux-stack';
import {UbuntuEC2Stack} from '../lib/ec2-ubuntu-stack'; 
import {UbuntuEc2UserdataStack} from '../lib/ec2-ubuntu-userdata-stack'
import { InfrastructureStack } from '../lib/ec2-infra-stack';
import {EC2WindowsStack} from '../lib/ec2-windows-stack';
import {S3RepoStack} from '../lib/s3-repo-stack'

let date_ob = new Date();
const dateStamp = date_ob.toDateString()
const timestamp = date_ob.toLocaleTimeString()
const dtstamp = dateStamp+''+' '+timestamp
const aws_region = 'us-east-2'
const solutionName = "awsbackuparch"
const environment = "dev"
const costcenter = "12_1_12_9_20_8"
const ec2KeyName = "OhioDevKey"

const app = new App();

new InfrastructureStack(app, `infra-stack`, {
  stackName: `${solutionName}-vpc-${aws_region}`,
   env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: aws_region || process.env.CDK_DEFAULT_REGION
  },
  environment, 
  solutionName, 
  serviceName: "ec2-infrastructure",
  costcenter
});

new S3RepoStack(app, `s3-bucket`, {
  stackName: `${solutionName}-s3-bucket-${aws_region}`,
   env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: aws_region || process.env.CDK_DEFAULT_REGION
  },
  environment, 
  solutionName, 
  appName: "s3-bucket",
  costcenter
});

new EC2WindowsStack(app, 'win-ec2', {
  stackName: 'CDK-EC2-Windows',
  env: {
    region: aws_region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  appName: "ec2-windows",
  solutionName,
  environment,
  costcenter,
  ec2KeyName,
  dtstamp,
  appPort: 22,
  testingLocation: "0.0.0.0/32" 
});



new UbuntuEc2UserdataStack(app, 'ubuntu-userdata', {
  env: {
    region: aws_region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  stackName: `${solutionName}-CDK-EC2-Ubuntu-NonPublic`, 
  serviceName: "ec2-ubuntu",
  solutionName,
  environment,
  costcenter,
  ec2KeyName,
  dtstamp,
  appPort: 22,
  testingLocation: "0.0.0.0/32" 
})

const ubuntu = new UbuntuEC2Stack(app, 'ubuntu', {
  stackName: `${solutionName}-CDK-EC2-Ubuntu`,
  env: {
    region: aws_region  || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
})



const ec2_stack = new EC2DeployStack(app, 'amazonlinux', {
  stackName: `${solutionName}-CDK-EC2-Linux-AMI-Deploy`,
  env: {
    region: aws_region  || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});


