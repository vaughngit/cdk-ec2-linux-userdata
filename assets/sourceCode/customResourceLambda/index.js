"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_iam_1 = require("@aws-sdk/client-iam"); //sdk v3 lib 
const client_ec2_1 = require("@aws-sdk/client-ec2");
const iamClient = new client_iam_1.IAMClient({ region: process.env.REGION });
// a client can be shared by different commands.
const ec2Client = new client_ec2_1.EC2Client({ region: process.env.REGION });
// // Set the parameters.
// const params = {
//   RoleName: "ROLE_NAME"
// }
// const run = async () => {
//   try {
//       const data = await iamClient.send(new DeleteRoleCommand(params));
//       console.log("Success. Role deleted.", data);
//   } catch (err) {
//       console.log("Error", err);
//   }
// };
//const tagVPCEndpoints = async (properties) =>{
const tagVPCEndpoints = async (event) => {
    //const vpcId = properties.vpcId
    const vpcId = event.ResourceProperties["vpcId"];
    const tags = event.ResourceProperties["tags"];
    let endPointTags = [...tags];
    let endPoints = []; //create empty array 
    // console.log("vpcId: ", vpcId)
    // console.log("endpointTags: ", endPointTags)
    const describeEndPoints = new client_ec2_1.DescribeVpcEndpointsCommand({ Filters: [{ Name: "vpc-id", Values: [vpcId] }] });
    //  const describeEndPoints = new DescribeVpcEndpointsCommand({Filters: [{Name: "vpc-endpoint-type", Values: ["Interface"]}]})
    let result = await ec2Client.send(describeEndPoints);
    //console.log("res ", result)
    // console.log("vpcendpoints: ", result.VpcEndpoints)
    for (const vpce of result.VpcEndpoints) {
        // console.log("vpcid", vpce.VpcEndpointId)
        //  console.log("serviceName", vpce.ServiceName)
        //  console.log("Type: ", vpce.VpcEndpointType)
        endPoints.push(vpce.VpcEndpointId);
    }
    try {
        const createTags = new client_ec2_1.CreateTagsCommand({ Resources: [...endPoints], Tags: [...endPointTags] });
        const request = await ec2Client.send(createTags);
        return {
            PhysicalResourceId: request.$metadata.requestId,
            data: {
                status: request.$metadata.httpStatusCode
            }
        };
    }
    catch (error) {
        console.log("create Tags error: ", error);
    }
};
const deleteNatInstanceRole = async (event) => {
    const instances = event.ResourceProperties["natGateways"];
    //const apiStage: string = event.ResourceProperties["API_STAGE"];
    // if (typeof apiId !== "string" || typeof apiStage !== "string") {
    //   throw new Error('"API_ID" and "API_STAGE" is required');
    // }
    console.log(instances);
    let profileName;
    let roleName;
    for (const instance of instances) {
        try {
            console.log(instance);
            console.log("Instance gatewayID", instance.gatewayId);
            let describeInstance = new client_ec2_1.DescribeInstancesCommand({ InstanceIds: [instance.gatewayId] });
            let instanceData = await ec2Client.send(describeInstance);
            // console.log("profile data: ", instanceData.Reservations[0].Instances[0].IamInstanceProfile.Arn)
            let instanceProfileArn = instanceData.Reservations[0].Instances[0].IamInstanceProfile.Arn;
            //console.log("str parse", instancePf.split('/')[1])
            profileName = instanceProfileArn.split('/')[1];
            console.log("parsed: ", profileName);
            let getInstanceProfile = new client_iam_1.GetInstanceProfileCommand({ InstanceProfileName: profileName });
            let profileDetails = await iamClient.send(getInstanceProfile);
            console.log(profileDetails.InstanceProfile.Roles[0].RoleName);
            roleName = profileDetails.InstanceProfile.Roles[0].RoleName;
            let removeProfile = new client_iam_1.RemoveRoleFromInstanceProfileCommand({ InstanceProfileName: profileName, RoleName: roleName });
            const request = await iamClient.send(removeProfile);
        }
        catch (error) {
            console.log("remove profile error: ", error);
        }
    }
    try {
        console.log("Delete Role Try ");
        // let getPerms = new ListRolePoliciesCommand({RoleName: profileDetails.InstanceProfile.Roles[0].RoleName})
        // let getPerms = new ListRolePoliciesCommand({RoleName: roleName})
        // await iamClient.send(getPerms)
        // console.log("profile res", rolePerms.PolicyNames)
        let detachRolePolicy = new client_iam_1.DetachRolePolicyCommand({ PolicyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore", RoleName: roleName });
        await iamClient.send(detachRolePolicy);
        let deleteRole = new client_iam_1.DeleteRoleCommand({ RoleName: roleName });
        const request = await iamClient.send(deleteRole);
        return {
            // PhysicalResourceId: roleName
            Data: {
                requestId: request.$metadata.requestId,
                requestStatus: request.$metadata.httpStatusCode,
            },
        };
    }
    catch (error) {
        console.log("remove role error: ", error);
    }
    finally {
        console.log("Completed role removal commands");
    }
};
const handler = async (event, context) => {
    console.log("event object: ", event);
    console.log("context object", context);
    switch (event.RequestType) {
        case "Create":
            /*       const promise1: CdkCustomResourceResponse = new Promise((resolve) => {
                    resolve("created");
                    return promise1
                  });
                  */
            return tagVPCEndpoints(event);
            (event);
        case "Update":
            return tagVPCEndpoints(event);
        case "Delete":
            // const promise3: CdkCustomResourceResponse = new Promise((resolve) => {
            //   resolve("ok");
            // });
            // return promise3;
            return deleteNatInstanceRole(event);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvREFBNkosQ0FBQyxhQUFhO0FBQzNLLG9EQUEySDtBQUkzSCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ2hFLGdEQUFnRDtBQUNoRCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBR2hFLHlCQUF5QjtBQUN6QixtQkFBbUI7QUFDbkIsMEJBQTBCO0FBQzFCLElBQUk7QUFFSiw0QkFBNEI7QUFDNUIsVUFBVTtBQUNWLDBFQUEwRTtBQUMxRSxxREFBcUQ7QUFDckQsb0JBQW9CO0FBQ3BCLG1DQUFtQztBQUNuQyxNQUFNO0FBQ04sS0FBSztBQUVMLGdEQUFnRDtBQUM5QyxNQUFNLGVBQWUsR0FBRyxLQUFLLEVBQUUsS0FBNkIsRUFBc0MsRUFBRTtJQUNuRyxnQ0FBZ0M7SUFDaEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxJQUFJLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDNUIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFBLENBQUMscUJBQXFCO0lBRXpDLGdDQUFnQztJQUNoQyw4Q0FBOEM7SUFFN0MsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHdDQUEyQixDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsRUFBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFB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NkIsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRTtJQUN4RSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFdkMsUUFBUSxLQUFLLENBQUMsV0FBVyxFQUFFO1FBQ3pCLEtBQUssUUFBUTtZQUNqQjs7OztvQkFJUTtZQUNGLE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQUEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxLQUFLLFFBQVE7WUFDWCxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVoQyxLQUFLLFFBQVE7WUFDWCx5RUFBeUU7WUFDekUsbUJBQW1CO1lBQ25CLE1BQU07WUFDTixtQkFBbUI7WUFFcEIsT0FBTyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUNyQztBQUNILENBQUMsQ0FBQztBQXZCVyxRQUFBLE9BQU8sV0F1QmxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgQVdTIGZyb20gXCJhd3Mtc2RrXCI7XG5pbXBvcnQgeyBJQU1DbGllbnQsIERlbGV0ZVJvbGVDb21tYW5kLCBSZW1vdmVSb2xlRnJvbUluc3RhbmNlUHJvZmlsZUNvbW1hbmQsIERldGFjaFJvbGVQb2xpY3lDb21tYW5kLCBHZXRJbnN0YW5jZVByb2ZpbGVDb21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1pYW1cIjsgLy9zZGsgdjMgbGliIFxuaW1wb3J0IHsgRUMyQ2xpZW50LCAgRGVzY3JpYmVJbnN0YW5jZXNDb21tYW5kLCBEZXNjcmliZVZwY0VuZHBvaW50c0NvbW1hbmQsIENyZWF0ZVRhZ3NDb21tYW5kIH0gZnJvbSBcIkBhd3Mtc2RrL2NsaWVudC1lYzJcIjtcbmltcG9ydCB7IENka0N1c3RvbVJlc291cmNlRXZlbnQsICBDZGtDdXN0b21SZXNvdXJjZUhhbmRsZXIsICBDZGtDdXN0b21SZXNvdXJjZVJlc3BvbnNlfSBmcm9tIFwiYXdzLWxhbWJkYVwiO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gXCJodHRwXCI7XG5cbmNvbnN0IGlhbUNsaWVudCA9IG5ldyBJQU1DbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LlJFR0lPTiB9KTtcbi8vIGEgY2xpZW50IGNhbiBiZSBzaGFyZWQgYnkgZGlmZmVyZW50IGNvbW1hbmRzLlxuY29uc3QgZWMyQ2xpZW50ID0gbmV3IEVDMkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuUkVHSU9OIH0pO1xuXG5cbi8vIC8vIFNldCB0aGUgcGFyYW1ldGVycy5cbi8vIGNvbnN0IHBhcmFtcyA9IHtcbi8vICAgUm9sZU5hbWU6IFwiUk9MRV9OQU1FXCJcbi8vIH1cblxuLy8gY29uc3QgcnVuID0gYXN5bmMgKCkgPT4ge1xuLy8gICB0cnkge1xuLy8gICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGlhbUNsaWVudC5zZW5kKG5ldyBEZWxldGVSb2xlQ29tbWFuZChwYXJhbXMpKTtcbi8vICAgICAgIGNvbnNvbGUubG9nKFwiU3VjY2Vzcy4gUm9sZSBkZWxldGVkLlwiLCBkYXRhKTtcbi8vICAgfSBjYXRjaCAoZXJyKSB7XG4vLyAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yXCIsIGVycik7XG4vLyAgIH1cbi8vIH07XG5cbi8vY29uc3QgdGFnVlBDRW5kcG9pbnRzID0gYXN5bmMgKHByb3BlcnRpZXMpID0+e1xuICBjb25zdCB0YWdWUENFbmRwb2ludHMgPSBhc3luYyAoZXZlbnQ6IENka0N1c3RvbVJlc291cmNlRXZlbnQpOiBQcm9taXNlPENka0N1c3RvbVJlc291cmNlUmVzcG9uc2U+ID0+IHsgIFxuICAgLy9jb25zdCB2cGNJZCA9IHByb3BlcnRpZXMudnBjSWRcbiAgIGNvbnN0IHZwY0lkID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzW1widnBjSWRcIl07XG4gICBjb25zdCB0YWdzID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzW1widGFnc1wiXTtcbiAgIGxldCBlbmRQb2ludFRhZ3MgPSBbLi4udGFnc11cbiAgIGxldCBlbmRQb2ludHMgPSBbXSAvL2NyZWF0ZSBlbXB0eSBhcnJheSBcblxuICAvLyBjb25zb2xlLmxvZyhcInZwY0lkOiBcIiwgdnBjSWQpXG4gIC8vIGNvbnNvbGUubG9nKFwiZW5kcG9pbnRUYWdzOiBcIiwgZW5kUG9pbnRUYWdzKVxuXG4gICBjb25zdCBkZXNjcmliZUVuZFBvaW50cyA9IG5ldyBEZXNjcmliZVZwY0VuZHBvaW50c0NvbW1hbmQoe0ZpbHRlcnM6IFt7TmFtZTogXCJ2cGMtaWRcIiwgVmFsdWVzOiBbdnBjSWRdfV19KVxuIC8vICBjb25zdCBkZXNjcmliZUVuZFBvaW50cyA9IG5ldyBEZXNjcmliZVZwY0VuZHBvaW50c0NvbW1hbmQoe0ZpbHRlcnM6IFt7TmFtZTogXCJ2cGMtZW5kcG9pbnQtdHlwZVwiLCBWYWx1ZXM6IFtcIkludGVyZmFjZVwiXX1dfSlcbiAgbGV0IHJlc3VsdCA9IGF3YWl0IGVjMkNsaWVudC5zZW5kKGRlc2NyaWJlRW5kUG9pbnRzKVxuICAgLy9jb25zb2xlLmxvZyhcInJlcyBcIiwgcmVzdWx0KVxuICAvLyBjb25zb2xlLmxvZyhcInZwY2VuZHBvaW50czogXCIsIHJlc3VsdC5WcGNFbmRwb2ludHMpXG4gICBmb3IoY29uc3QgdnBjZSBvZiByZXN1bHQuVnBjRW5kcG9pbnRzKXtcbiAgICAgLy8gY29uc29sZS5sb2coXCJ2cGNpZFwiLCB2cGNlLlZwY0VuZHBvaW50SWQpXG4gICAgLy8gIGNvbnNvbGUubG9nKFwic2VydmljZU5hbWVcIiwgdnBjZS5TZXJ2aWNlTmFtZSlcbiAgICAvLyAgY29uc29sZS5sb2coXCJUeXBlOiBcIiwgdnBjZS5WcGNFbmRwb2ludFR5cGUpXG4gICAgICBlbmRQb2ludHMucHVzaCh2cGNlLlZwY0VuZHBvaW50SWQpXG4gICB9XG4gICB0cnl7XG4gICBjb25zdCBjcmVhdGVUYWdzID0gbmV3IENyZWF0ZVRhZ3NDb21tYW5kKHtSZXNvdXJjZXM6IFsuLi5lbmRQb2ludHNdLCBUYWdzOiBbLi4uZW5kUG9pbnRUYWdzXX0pXG4gICBjb25zdCByZXF1ZXN0ID0gYXdhaXQgZWMyQ2xpZW50LnNlbmQoY3JlYXRlVGFncylcbiAgIHJldHVybiB7XG4gICAgUGh5c2ljYWxSZXNvdXJjZUlkOiByZXF1ZXN0LiRtZXRhZGF0YS5yZXF1ZXN0SWQsXG4gICAgZGF0YToge1xuICAgICAgc3RhdHVzOiByZXF1ZXN0LiRtZXRhZGF0YS5odHRwU3RhdHVzQ29kZVxuICAgIH1cbiAgIH1cbiAgIH1jYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmxvZyhcImNyZWF0ZSBUYWdzIGVycm9yOiBcIiwgZXJyb3IpXG4gIH1cbiAgICBcbn1cblxuXG5cbmNvbnN0IGRlbGV0ZU5hdEluc3RhbmNlUm9sZSA9IGFzeW5jIChldmVudDogQ2RrQ3VzdG9tUmVzb3VyY2VFdmVudCk6IFByb21pc2U8Q2RrQ3VzdG9tUmVzb3VyY2VSZXNwb25zZT4gPT4ge1xuICBjb25zdCBpbnN0YW5jZXMgPSBldmVudC5SZXNvdXJjZVByb3BlcnRpZXNbXCJuYXRHYXRld2F5c1wiXTtcbiAgLy9jb25zdCBhcGlTdGFnZTogc3RyaW5nID0gZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzW1wiQVBJX1NUQUdFXCJdO1xuXG4gIC8vIGlmICh0eXBlb2YgYXBpSWQgIT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIGFwaVN0YWdlICE9PSBcInN0cmluZ1wiKSB7XG4gIC8vICAgdGhyb3cgbmV3IEVycm9yKCdcIkFQSV9JRFwiIGFuZCBcIkFQSV9TVEFHRVwiIGlzIHJlcXVpcmVkJyk7XG4gIC8vIH1cbiAgY29uc29sZS5sb2coaW5zdGFuY2VzKVxuXG4gIGxldCBwcm9maWxlTmFtZSBcbiAgbGV0IHJvbGVOYW1lIFxuXG4gIGZvcihjb25zdCBpbnN0YW5jZSBvZiBpbnN0YW5jZXMpe1xuICAgIHRyeXtcbiAgICAgIGNvbnNvbGUubG9nKGluc3RhbmNlKVxuICAgICAgY29uc29sZS5sb2coXCJJbnN0YW5jZSBnYXRld2F5SURcIiwgaW5zdGFuY2UuZ2F0ZXdheUlkKVxuICAgICAgbGV0IGRlc2NyaWJlSW5zdGFuY2UgPSBuZXcgRGVzY3JpYmVJbnN0YW5jZXNDb21tYW5kKHtJbnN0YW5jZUlkczogW2luc3RhbmNlLmdhdGV3YXlJZF19KTtcbiAgICAgIGxldCBpbnN0YW5jZURhdGEgPSBhd2FpdCBlYzJDbGllbnQuc2VuZChkZXNjcmliZUluc3RhbmNlKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwicHJvZmlsZSBkYXRhOiBcIiwgaW5zdGFuY2VEYXRhLlJlc2VydmF0aW9uc1swXS5JbnN0YW5jZXNbMF0uSWFtSW5zdGFuY2VQcm9maWxlLkFybilcbiAgICAgICBsZXQgaW5zdGFuY2VQcm9maWxlQXJuID0gaW5zdGFuY2VEYXRhLlJlc2VydmF0aW9uc1swXS5JbnN0YW5jZXNbMF0uSWFtSW5zdGFuY2VQcm9maWxlLkFybiBcbiAgICAgICAvL2NvbnNvbGUubG9nKFwic3RyIHBhcnNlXCIsIGluc3RhbmNlUGYuc3BsaXQoJy8nKVsxXSlcbiAgICAgICBwcm9maWxlTmFtZSA9IGluc3RhbmNlUHJvZmlsZUFybi5zcGxpdCgnLycpWzFdXG4gICAgICAgY29uc29sZS5sb2coXCJwYXJzZWQ6IFwiLCBwcm9maWxlTmFtZSlcbiBcbiAgICAgIGxldCBnZXRJbnN0YW5jZVByb2ZpbGUgPSBuZXcgR2V0SW5zdGFuY2VQcm9maWxlQ29tbWFuZCh7SW5zdGFuY2VQcm9maWxlTmFtZTogcHJvZmlsZU5hbWUgfSlcbiAgICAgIGxldCBwcm9maWxlRGV0YWlscyA9IGF3YWl0IGlhbUNsaWVudC5zZW5kKGdldEluc3RhbmNlUHJvZmlsZSlcbiBcbiAgICAgIGNvbnNvbGUubG9nKHByb2ZpbGVEZXRhaWxzLkluc3RhbmNlUHJvZmlsZS5Sb2xlc1swXS5Sb2xlTmFtZSlcbiAgICAgIHJvbGVOYW1lID0gcHJvZmlsZURldGFpbHMuSW5zdGFuY2VQcm9maWxlLlJvbGVzWzBdLlJvbGVOYW1lIFxuICAgICAgbGV0IHJlbW92ZVByb2ZpbGUgPSBuZXcgUmVtb3ZlUm9sZUZyb21JbnN0YW5jZVByb2ZpbGVDb21tYW5kKHtJbnN0YW5jZVByb2ZpbGVOYW1lOiBwcm9maWxlTmFtZSwgUm9sZU5hbWU6IHJvbGVOYW1lIH0pXG4gICAgICBjb25zdCByZXF1ZXN0ID0gYXdhaXQgaWFtQ2xpZW50LnNlbmQocmVtb3ZlUHJvZmlsZSlcblxuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlIHByb2ZpbGUgZXJyb3I6IFwiLCBlcnJvcilcbiAgICB9XG4gIH1cbiAgXG4gICAgdHJ5IHtcblxuICAgICAgY29uc29sZS5sb2coXCJEZWxldGUgUm9sZSBUcnkgXCIgKVxuICAgICAgICAvLyBsZXQgZ2V0UGVybXMgPSBuZXcgTGlzdFJvbGVQb2xpY2llc0NvbW1hbmQoe1JvbGVOYW1lOiBwcm9maWxlRGV0YWlscy5JbnN0YW5jZVByb2ZpbGUuUm9sZXNbMF0uUm9sZU5hbWV9KVxuICAgICAgIC8vIGxldCBnZXRQZXJtcyA9IG5ldyBMaXN0Um9sZVBvbGljaWVzQ29tbWFuZCh7Um9sZU5hbWU6IHJvbGVOYW1lfSlcbiAgICAgICAvLyBhd2FpdCBpYW1DbGllbnQuc2VuZChnZXRQZXJtcylcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJwcm9maWxlIHJlc1wiLCByb2xlUGVybXMuUG9saWN5TmFtZXMpXG4gXG4gICAgICAgIGxldCBkZXRhY2hSb2xlUG9saWN5ID0gbmV3IERldGFjaFJvbGVQb2xpY3lDb21tYW5kKHtQb2xpY3lBcm46IFwiYXJuOmF3czppYW06OmF3czpwb2xpY3kvQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZVwiLCBSb2xlTmFtZTogcm9sZU5hbWV9KVxuICAgICAgICBhd2FpdCBpYW1DbGllbnQuc2VuZChkZXRhY2hSb2xlUG9saWN5KVxuXG4gICAgICAgIGxldCBkZWxldGVSb2xlID0gbmV3IERlbGV0ZVJvbGVDb21tYW5kKHtSb2xlTmFtZTogcm9sZU5hbWV9KVxuICAgICAgIGNvbnN0IHJlcXVlc3QgPSBhd2FpdCBpYW1DbGllbnQuc2VuZChkZWxldGVSb2xlKSAgICBcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgLy8gUGh5c2ljYWxSZXNvdXJjZUlkOiByb2xlTmFtZVxuICAgICAgICAgRGF0YToge1xuICAgICAgICAgIHJlcXVlc3RJZDogcmVxdWVzdC4kbWV0YWRhdGEucmVxdWVzdElkLFxuICAgICAgICAgIHJlcXVlc3RTdGF0dXM6IHJlcXVlc3QuJG1ldGFkYXRhLmh0dHBTdGF0dXNDb2RlLFxuICAgICAgICAgfSxcbiAgICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwicmVtb3ZlIHJvbGUgZXJyb3I6IFwiLCBlcnJvcilcbiAgICB9IGZpbmFsbHkge1xuICAgICAgY29uc29sZS5sb2coXCJDb21wbGV0ZWQgcm9sZSByZW1vdmFsIGNvbW1hbmRzXCIpXG4gICAgfVxuXG59O1xuXG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBDZGtDdXN0b21SZXNvdXJjZUhhbmRsZXIgPSBhc3luYyAoZXZlbnQsIGNvbnRleHQpID0+IHtcbiAgY29uc29sZS5sb2coXCJldmVudCBvYmplY3Q6IFwiLGV2ZW50KTtcbiAgY29uc29sZS5sb2coXCJjb250ZXh0IG9iamVjdFwiLCBjb250ZXh0KTtcblxuICBzd2l0Y2ggKGV2ZW50LlJlcXVlc3RUeXBlKSB7XG4gICAgY2FzZSBcIkNyZWF0ZVwiOlxuLyogICAgICAgY29uc3QgcHJvbWlzZTE6IENka0N1c3RvbVJlc291cmNlUmVzcG9uc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICByZXNvbHZlKFwiY3JlYXRlZFwiKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2UxIFxuICAgICAgfSk7XG4gICAgICAqL1xuICAgICAgcmV0dXJuIHRhZ1ZQQ0VuZHBvaW50cyhldmVudCk7KGV2ZW50KTtcbiAgICBjYXNlIFwiVXBkYXRlXCI6XG4gICAgICByZXR1cm4gdGFnVlBDRW5kcG9pbnRzKGV2ZW50KTtcblxuICAgIGNhc2UgXCJEZWxldGVcIjpcbiAgICAgIC8vIGNvbnN0IHByb21pc2UzOiBDZGtDdXN0b21SZXNvdXJjZVJlc3BvbnNlID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgIC8vICAgcmVzb2x2ZShcIm9rXCIpO1xuICAgICAgLy8gfSk7XG4gICAgICAvLyByZXR1cm4gcHJvbWlzZTM7XG5cbiAgICAgcmV0dXJuIGRlbGV0ZU5hdEluc3RhbmNlUm9sZShldmVudClcbiAgfVxufTsiXX0=