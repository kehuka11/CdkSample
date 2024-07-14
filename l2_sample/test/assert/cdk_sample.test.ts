
import * as cdkStack from '../../lib/cdk_sample-stack';
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

test('ECR AssertTest', () => {

    const app = new cdk.App();
    const stack = new cdkStack.CdkSampleStack(app, "TestStack");

    const template = Template.fromStack(stack);

    // ECR リソースチェック
    template.resourceCountIs("AWS::ECR::Repository", 1);

    // ECRプロパティチェック
    template.hasResourceProperties("AWS::ECR::Repository", {
        RepositoryName: "test-repository",
        ImageScanningConfiguration: {
            ScanOnPush: true,
        },
    });

});


test('VPC AssertTest', () => {

    const app = new cdk.App();
    const stack = new cdkStack.CdkSampleStack(app, "TestStack");

    const template = Template.fromStack(stack);

    // VPC リソースチェック
    template.resourceCountIs("AWS::EC2::VPC", 1);

    // VPCプロパティチェック
    template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: "10.0.0.0/16",
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
        InstanceTenancy: "default",
      });

    //  subnet リソースチェック
    const subnets = template.findResources('AWS::EC2::Subnet');
    expect(Object.keys(subnets).length).toBe(4); // 2 AZ * 2 サブネット = 4

});