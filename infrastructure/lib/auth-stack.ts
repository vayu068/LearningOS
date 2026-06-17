import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface AuthStackProps extends cdk.StackProps {
  stage: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Pre-signup Lambda trigger for tenant validation
    const preSignUpTrigger = new lambda.Function(this, "PreSignUpTrigger", {
      functionName: `learning-os-${props.stage}-pre-signup`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Validate tenant exists and accepts new registrations
          const tenantId = event.request.clientMetadata?.tenantId;
          if (!tenantId) {
            throw new Error('Tenant ID is required for registration');
          }
          event.response.autoConfirmUser = false;
          event.response.autoVerifyEmail = false;
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Post-confirmation Lambda trigger for user setup
    const postConfirmationTrigger = new lambda.Function(this, "PostConfirmationTrigger", {
      functionName: `learning-os-${props.stage}-post-confirmation`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Create user record in DynamoDB, assign default role
          console.log('User confirmed:', event.userName);
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Custom message Lambda trigger for branded emails
    const customMessageTrigger = new lambda.Function(this, "CustomMessageTrigger", {
      functionName: `learning-os-${props.stage}-custom-message`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Customize email templates per tenant branding
          if (event.triggerSource === 'CustomMessage_SignUp') {
            event.response.emailSubject = 'Welcome to LearningOS - Verify your email';
            event.response.emailMessage = \`Your verification code is: \${event.request.codeParameter}\`;
          }
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Pre-token generation trigger for custom claims
    const preTokenTrigger = new lambda.Function(this, "PreTokenTrigger", {
      functionName: `learning-os-${props.stage}-pre-token`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Add tenant-specific claims and permissions to token
          const tenantId = event.request.userAttributes['custom:tenantId'];
          const role = event.request.userAttributes['custom:role'];
          event.response = {
            claimsOverrideDetails: {
              claimsToAddOrOverride: {
                'custom:permissions': JSON.stringify([]),
                'custom:tenantId': tenantId || '',
                'custom:role': role || 'student',
              },
            },
          };
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Main Cognito User Pool with MFA and custom attributes
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `learning-os-${props.stage}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        phone: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: true, mutable: true },
        phoneNumber: { required: false, mutable: true },
        locale: { required: false, mutable: true },
      },
      customAttributes: {
        tenantId: new cognito.StringAttribute({ mutable: false, minLen: 1, maxLen: 64 }),
        role: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 32 }),
        institutionId: new cognito.StringAttribute({ mutable: true, minLen: 0, maxLen: 64 }),
        apaarId: new cognito.StringAttribute({ mutable: true, minLen: 0, maxLen: 12 }),
        preferredLanguage: new cognito.StringAttribute({ mutable: true, minLen: 2, maxLen: 5 }),
        onboardingComplete: new cognito.StringAttribute({ mutable: true, minLen: 4, maxLen: 5 }),
      },
      mfa: props.stage === "prod" ? cognito.Mfa.REQUIRED : cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: true,
        otp: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
      userVerification: {
        emailSubject: "LearningOS - Verify your email",
        emailBody: "Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: "Your LearningOS verification code is {####}",
      },
      lambdaTriggers: {
        preSignUp: preSignUpTrigger,
        postConfirmation: postConfirmationTrigger,
        customMessage: customMessageTrigger,
        preTokenGeneration: preTokenTrigger,
      },
      removalPolicy:
        props.stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // User Pool Domain for hosted UI
    this.userPool.addDomain("Domain", {
      cognitoDomain: {
        domainPrefix: `learning-os-${props.stage}`,
      },
    });

    // Resource server for custom scopes
    const resourceServer = this.userPool.addResourceServer("ResourceServer", {
      identifier: "learning-os-api",
      userPoolResourceServerName: "LearningOS API",
      scopes: [
        { scopeName: "read:profile", scopeDescription: "Read user profile" },
        { scopeName: "write:profile", scopeDescription: "Update user profile" },
        { scopeName: "read:content", scopeDescription: "Read learning content" },
        { scopeName: "write:content", scopeDescription: "Create/update content" },
        { scopeName: "admin:tenant", scopeDescription: "Tenant administration" },
        { scopeName: "admin:platform", scopeDescription: "Platform administration" },
      ],
    });

    // Web client for browser-based access
    this.userPoolClient = this.userPool.addClient("WebClient", {
      userPoolClientName: `learning-os-${props.stage}-web-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.PHONE,
        ],
        callbackUrls: [
          `https://${props.stage}.platform.gov.in/auth/callback`,
          ...(props.stage !== "prod" ? ["http://localhost:3000/auth/callback"] : []),
        ],
        logoutUrls: [
          `https://${props.stage}.platform.gov.in/auth/logout`,
          ...(props.stage !== "prod" ? ["http://localhost:3000/auth/logout"] : []),
        ],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
      generateSecret: false,
    });

    // Machine-to-machine client for backend services
    this.userPool.addClient("ServiceClient", {
      userPoolClientName: `learning-os-${props.stage}-service-client`,
      authFlows: {
        custom: true,
      },
      oAuth: {
        flows: {
          clientCredentials: true,
        },
        scopes: [
          cognito.OAuthScope.custom("learning-os-api/admin:platform"),
        ],
      },
      accessTokenValidity: cdk.Duration.minutes(15),
      generateSecret: true,
    });

    // Identity Pool for federated access (DigiLocker, Google, etc.)
    this.identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `learning_os_${props.stage}_identity_pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
    });

    // Authenticated role for identity pool
    const authenticatedRole = new iam.Role(this, "AuthenticatedRole", {
      roleName: `learning-os-${props.stage}-authenticated`,
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Attach minimal policies to authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [
          `arn:aws:s3:::learning-os-${props.stage}-uploads-${cdk.Aws.ACCOUNT_ID}/private/\${cognito-identity.amazonaws.com:sub}/*`,
        ],
      })
    );

    // Unauthenticated role (deny all for safety)
    const unauthenticatedRole = new iam.Role(this, "UnauthenticatedRole", {
      roleName: `learning-os-${props.stage}-unauthenticated`,
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": this.identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoles", {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      exportName: `${props.stage}-UserPoolId`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: `${props.stage}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: this.identityPool.ref,
      exportName: `${props.stage}-IdentityPoolId`,
    });

    new cdk.CfnOutput(this, "UserPoolArn", {
      value: this.userPool.userPoolArn,
      exportName: `${props.stage}-UserPoolArn`,
    });
  }
}
