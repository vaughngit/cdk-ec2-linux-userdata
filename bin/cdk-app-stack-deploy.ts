#!/usr/bin/env node
//import * as cdk from '@aws-cdk/core';
//import {App, Stack, Construct, Tags, StackProps} from '@aws-cdk/core';
import {Tags, App}from 'aws-cdk-lib';
import {EC2DeployStack} from '../lib/ec2-linux-stack';
import {UbuntuEC2Stack} from '../lib/ec2-ubuntu-stack'; 
import {MongoDbDeployStack} from '../lib/ec2-mongodb-linux-privateip-stack'

let date_ob = new Date();
const dateStamp = date_ob.toDateString()
const timestamp = date_ob.toLocaleTimeString()
const dtstamp = dateStamp+''+' '+timestamp

const app = new App();
const region = app.node.tryGetContext('target_region');

const ec2_stack = new EC2DeployStack(app, 'amazonlinux', {
  stackName: 'CDK-EC2-Linux-AMI-Deploy',
  env: {
    region: region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

const ubuntu = new UbuntuEC2Stack(app, 'ubuntu', {
  stackName: 'CDK-EC2-Ubuntu',
  env: {
    region: region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
})

new MongoDbDeployStack(app, 'Mongodb', {
  stackName: 'CDK-EC2-Mongodb',
  env: {
    region: region || process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
})

//Tags.of(app).add("solution", "RedisViewer")
//Tags.of(app).add("ResourceGroup", "RedisViewer")
Tags.of(app).add("environment", "dev")
Tags.of(app).add("costcenter", "technetcentral")
Tags.of(app).add("updatetimestamp", dtstamp)