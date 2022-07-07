#!/usr/bin/env node
//import * as cdk from '@aws-cdk/core';
//import {App, Stack, Construct, Tags, StackProps} from '@aws-cdk/core';
import {Tags, App}from 'aws-cdk-lib';
import {EC2DeployStack} from '../lib/ec2-linux-stack';

let date_ob = new Date();
const dateStamp = date_ob.toDateString()
const timestamp = date_ob.toLocaleTimeString()
const dtstamp = dateStamp+''+' '+timestamp

const app = new App();
const region = app.node.tryGetContext('target_region');
const ec2_stack = new EC2DeployStack(app, 'cdk-stack', {
  stackName: 'CDK-EC2-Linux-AMI-Deploy',
  env: {
    region: region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

Tags.of(app).add("solution", "DemoApp")
Tags.of(app).add("ResourceGroup", "DemoApp")
Tags.of(app).add("environment", "dev")
Tags.of(app).add("costcenter", "demo-department")
Tags.of(app).add("updatetimestamp", dtstamp)