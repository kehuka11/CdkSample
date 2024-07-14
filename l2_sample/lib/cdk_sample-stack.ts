import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCの作成
    const vpc = new ec2.Vpc(this, 'TestVpc', {
      maxAzs: 2,
      natGateways: 0,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
            cidrMask: 24,
            name: 'public-subnet',
            subnetType: ec2.SubnetType.PUBLIC,
        },
        {
            cidrMask: 24,
            name: 'private-subnet',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
    ],
    defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    });

    // ECSクラスターの作成
    const cluster = new ecs.Cluster(this, 'TestCluster', {
      vpc: vpc,
    });

    // ECRリポジトリの作成
    const repository = new ecr.Repository(this, 'TestRepository', {
      repositoryName: 'test-repository',
      imageScanOnPush: true,
    });

    // Secret Managerのシークレットを参照
    const secret = secretsmanager.Secret.fromSecretNameV2(this, 'TestSecret', 'Test-secret');

    // JSONファイルからタスク定義を読み込む
    const taskDefinitionJson = fs.readFileSync('ecs_task_definision/taskDefinition.json', 'utf8');
    const taskDefinitionProps = JSON.parse(taskDefinitionJson);

    // CloudWatch Logsのロググループを作成
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: taskDefinitionProps.containerDefinitions[0].logConfiguration.options['awslogs-group'],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にロググループを削除する
    });

    // タスク定義の作成
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TestTaskDefinition', {
      memoryLimitMiB: taskDefinitionProps.memory,
      cpu: taskDefinitionProps.cpu,
      executionRole: iam.Role.fromRoleName(this, 'TaskExecutionRole', 'TestTaskExecusionRole'),
      taskRole: iam.Role.fromRoleName(this, 'TaskRole', 'TestTaskRole'),
    });

    // ECRリポジトリのURIを取得し、タグを追加
    const repositoryUri = repository.repositoryUriForTag('latest');

    const container = taskDefinition.addContainer('TestContainer', {
      // タスク定義でECRリポジトリのイメージを使用し、タグを指定
      image: ecs.ContainerImage.fromRegistry(repositoryUri),
      logging: new ecs.AwsLogDriver({
        streamPrefix: taskDefinitionProps.containerDefinitions[0].logConfiguration.options['awslogs-stream-prefix'],
        logGroup: logGroup,
      }),
      environment: taskDefinitionProps.containerDefinitions[0].environment.reduce((acc: any, env: any) => {
        acc[env.name] = env.value;
        return acc;
      }, {}),
      secrets: {
        SECRET_USERNAME: ecs.Secret.fromSecretsManager(secret, 'username'),
        SECRET_PASSWORD: ecs.Secret.fromSecretsManager(secret, 'password'),
      },
    });

    container.addPortMappings({
      containerPort: taskDefinitionProps.containerDefinitions[0].portMappings[0].containerPort,
      hostPort: taskDefinitionProps.containerDefinitions[0].portMappings[0].hostPort,
    });

    // ECSサービスの作成
    new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'TestFargateService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      publicLoadBalancer: true,
    });
  }
}
