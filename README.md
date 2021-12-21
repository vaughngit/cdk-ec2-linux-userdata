# EC2 User Data Example in AWS CDK - Complete Guide

A repository for an article on
[bobbyhadz.com](https://bobbyhadz.com/blog/aws-cdk-ec2-userdata-example)

## How to Use

1. Clone the repository

2. Install the dependencies

```bash
npm install
```

3. Create the CDK stack

```bash
npx cdk deploy
```

4. Open the AWS CloudFormation Console and the stack should be created in your
   default region

5. Cleanup

```bash
npx cdk destroy
```
## How to List Users in Linux: Local user information is stored in the /etc/passwd file. Each line in this file represents login information for one user.
   >  getent passwd
   > getent passwd | grep testuser

   sudo useradd testuser 

* ` sudo useradd first.last@domain.com ` Does not work

Reference: https://www.lifewire.com/create-users-useradd-command-3572157


