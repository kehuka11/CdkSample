import * as cdkStack from '../../lib/cdk_sample-stack';
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";

test("Snapshot Test", () => {

    const app = new cdk.App();
    const stack = new cdkStack.CdkSampleStack(app, "TestStack");
    const template = Template.fromStack(stack);

    // snapshotとテンプレート比較
    expect(template.toJSON()).toMatchSnapshot();
  });