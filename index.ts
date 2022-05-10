import * as awsnative from '@pulumi/aws-native';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { local } from '@pulumi/command';

const prefix = 'nodejs16'
const role = new awsnative.iam.Role(`${prefix}-role`, {
  assumeRolePolicyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
        Effect: 'Allow',
        Sid: '',
      },
    ],
  },
});

new aws.iam.RolePolicyAttachment(`${prefix}-role-attachment`, {
  role: pulumi.interpolate`${role.roleName}`,
  policyArn: aws.iam.ManagedPolicy.AWSLambdaBasicExecutionRole,
});

const lambda = new awsnative.lambda.Function(`${prefix}-func`, {
  role: role.arn,
  handler: 'index.handler',
  functionName: 'nodejs16',
  runtime: 'nodejs16.x',
  code: {
    zipFile: `exports.handler = function(event, context, callback){ callback(null, {"response": process.env.AWS_EXECUTION_ENV}); };`,
  }

}, { dependsOn: role });

const url = new awsnative.lambda.Url(`${prefix}-url`, {
  authType: awsnative.lambda.UrlAuthType.None,
  targetFunctionArn: lambda.arn,
}, { dependsOn: lambda });

new local.Command(`${prefix}-fix-permissions`, {
    create: pulumi.interpolate`aws lambda add-permission --function-name ${lambda.functionName} --action lambda:InvokeFunctionUrl --principal '*' --function-url-auth-type NONE --statement-id FunctionURLAllowPublicAccess`
}, {deleteBeforeReplace: true, dependsOn: [lambda]});

export const demo = {
  functionName: lambda.functionName,
  functionUrl: url.functionUrl
}

