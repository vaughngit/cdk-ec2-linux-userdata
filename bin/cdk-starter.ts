#!/usr/bin/env node
//import * as cdk from '@aws-cdk/core';
import {App, Stack, Construct, Tags, StackProps} from '@aws-cdk/core';
import {CdkStarterStack} from '../lib/cdk-starter-stack';

let date_ob = new Date();
const dateStamp = date_ob.toDateString()
const timestamp = date_ob.toLocaleTimeString()
const dtstamp = dateStamp+''+' '+timestamp

const app = new App();
const ec2_stack = new CdkStarterStack(app, 'cdk-stack', {
  stackName: 'CDK-EC2-Deploy',
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

Tags.of(ec2_stack).add("Layer", "Compute")
Tags.of(ec2_stack).add("Layer", "Compute")
Tags.of(app).add("ResourceGroup", "CDK-SSMSessionRunAs")
Tags.of(app).add("environment", "customerTesting")
Tags.of(app).add("costcenter", "blackbuad")
Tags.of(app).add("updatetimestamp", dtstamp)