"use strict";
const Generator = require("yeoman-generator");
const path = require("path");
const glob = require("glob");
const types = require("@sap-devx/yeoman-ui-types");

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.setPromptsCallback = (fn) => {
      if (this.prompts) {
        this.prompts.setCallback(fn);
      }
    };
    const virtualPrompts = [
      {
        name: "Project Attributes",
        description: "Configure the main project attributes."
      },
      {
        name: "Runtime Selection",
        description: "Choose and configure your runtime."
      },
      {
        name: "API Selection",
        description: "Choose and configure APIs."
      },
      {
        name: "Additional Attributes",
        description: "Configure additional attributes."
      },
      {
        name: "Further Attributes",
        description: "Configure further attributes."
      }
    ];
    this.prompts = new types.Prompts(virtualPrompts);
  }

  initializing() {
    process.chdir(this.destinationRoot());
  }

  async prompting() {
    // defaults
    const answers = {};
    answers.projectName = "app";
    answers.newDir = true;
    answers.BTPRuntime = "Kyma";
    answers.namespace = "default";
    answers.kubeconfig = "";
    answers.apiS4HC = false;
    answers.apiGraph = false;
    answers.apiGraphURL = "https://<region>.graph.sap/api";
    answers.apiGraphId = "v1";
    answers.apiGraphTokenURL = "https://<subdomain>.authentication.<region>.hana.ondemand.com";
    answers.apiDest = false;
    answers.hana = false;
    answers.authentication = true;
    answers.authorization = true;
    answers.apiGraphSameSubaccount = true;
    answers.customDomain = "";
    answers.clusterDomain = "0000000.kyma.ondemand.com";
    answers.gateway = "kyma-gateway.kyma-system.svc.cluster.local";
    answers.ui = true;
    answers.externalSessionManagement = false;
    answers.buildDeploy = false;
    // prompts
    const answersProject = await this.prompt([
      {
        type: "input",
        name: "projectName",
        message: "What project name would you like?",
        validate: (s) => {
          if (/^[a-zA-Z0-9_-]*$/g.test(s)) {
            return true;
          }
          return "Please only use alphanumeric characters for the project name.";
        },
        default: answers.projectName
      },
      {
        type: "confirm",
        name: "newDir",
        message: "Would you like to create a new directory for this project?",
        default: answers.newDir
      }
    ]);
    const answersRuntime = await this.prompt([
      {
        type: "list",
        name: "BTPRuntime",
        message: "Which runtime will you be deploying the project to?",
        choices: [{ name: "SAP BTP, Kyma runtime", value: "Kyma" }],
        store: true,
        default: answers.BTPRuntime
      },
      {
        when: response => response.BTPRuntime === "Kyma",
        type: "input",
        name: "namespace",
        message: "What SAP BTP, Kyma runtime namespace will you be deploying to?",
        validate: (s) => {
          if (/^[a-z0-9-]*$/g.test(s) && s.length > 0 && s.substring(0, 1) !== '-' && s.substring(s.length - 1) !== '-') {
            return true;
          }
          return "Your SAP BTP, Kyma runtime namespace can only contain lowercase alphanumeric characters or -.";
        },
        store: true,
        default: answers.namespace
      },
      {
        when: response => response.BTPRuntime === "Kyma",
        type: "input",
        name: "kubeconfig",
        message: "What is the path of your Kubeconfig file? Leave blank to use the KUBECONFIG environment variable instead.",
        default: answers.kubeconfig
      }
    ]);
    const answersAPI = await this.prompt([
      {
        type: "confirm",
        name: "apiS4HC",
        message: "Would you like to access the SAP S/4HANA Cloud Sales Orders API?",
        default: answers.apiS4HC
      },
      {
        type: "confirm",
        name: "apiGraph",
        message: "Would you like to use SAP Graph?",
        default: answers.apiGraph
      },
      {
        when: response => response.apiGraph === true,
        type: "input",
        name: "apiGraphURL",
        message: "What is your SAP Graph URL?",
        default: answers.apiGraphURL
      },
      {
        when: response => response.apiGraph === true,
        type: "input",
        name: "apiGraphId",
        message: "What is your SAP Graph Business Data Graph Identifier?",
        default: answers.apiGraphId
      },
      {
        when: response => response.apiGraph === true,
        type: "input",
        name: "apiGraphTokenURL",
        message: "What is your SAP Graph Token URL?",
        default: answers.apiGraphTokenURL
      },
      {
        type: "confirm",
        name: "apiDest",
        message: "Would you like to test the Destination service with SAP Cloud SDK?",
        default: answers.apiDest
      }
    ]);
    const answersAdditional = await this.prompt([
      {
        type: "confirm",
        name: "hana",
        message: "Would you like to use SAP HANA Cloud?",
        default: answers.hana
      },
      {
        type: "confirm",
        name: "authentication",
        message: "Would you like authentication?",
        default: answers.authentication
      },
      {
        when: response => response.authentication === true,
        type: "confirm",
        name: "authorization",
        message: "Would you like authorization?",
        default: answers.authorization
      },
      {
        when: response => response.authentication === true && answersAPI.apiGraph === true,
        type: "confirm",
        name: "apiGraphSameSubaccount",
        message: "Will you be deploying to the subaccount of the SAP Graph service instance?",
        default: answers.apiGraphSameSubaccount
      },
      {
        type: "input",
        name: "customDomain",
        message: "Will you be using a wildcard custom domain (eg: apps.domain.com)? If so please enter the custom domain name here. Leave blank to use the platform default.",
        validate: (s) => {
          if (s === "") {
            return true;
          }
          if (/^[a-zA-Z0-9.-]*$/g.test(s)) {
            return true;
          }
          return "Please only use alphanumeric characters for the custom domain.";
        },
        default: answers.customDomain
      }
    ]);
    if (answersRuntime.BTPRuntime === "Kyma" && answersAdditional.customDomain === "") {
      let cmd = ["get", "cm", "shoot-info", "-n", "kube-system", "-o", "jsonpath='{.data.domain}'"];
      if (answersRuntime.kubeconfig !== "") {
        cmd.push("--kubeconfig", answersRuntime.kubeconfig);
      }
      let opt = { "stdio": [process.stdout] };
      try {
        let resGet = this.spawnCommandSync("kubectl", cmd, opt);
        if (resGet.exitCode === 0) {
          answers.clusterDomain = resGet.stdout.toString().replace(/'/g, '');
        }
      } catch (error) {
        this.log("kubectl:", error);
      }
    } else {
      answers.clusterDomain = answersAdditional.customDomain;
    }
    const answersFurther = await this.prompt([
      {
        when: answersRuntime.BTPRuntime === "Kyma" && answersAdditional.customDomain === "",
        type: "input",
        name: "clusterDomain",
        message: "What is the cluster domain of your SAP BTP, Kyma runtime?",
        default: answers.clusterDomain
      },
      {
        when: answersRuntime.BTPRuntime === "Kyma" && answersAdditional.customDomain !== "",
        type: "input",
        name: "gateway",
        message: "What is the gateway for the custom domain in your SAP BTP, Kyma runtime?",
        default: answers.gateway
      },
      {
        type: "confirm",
        name: "ui",
        message: "Would you like a UI?",
        default: answers.ui
      },
      {
        when: response => response.ui === true && answersRuntime.BTPRuntime === "Kyma",
        type: "confirm",
        name: "externalSessionManagement",
        message: "Would you like to configure external session management (using Redis)?",
        default: answers.externalSessionManagement
      },
      {
        type: "confirm",
        name: "buildDeploy",
        message: "Would you like to deploy the project?",
        default: answers.buildDeploy
      }
    ]);
    if (answersAdditional.authentication === false) {
      answersAdditional.authorization = false;
    }
    if (answersProject.newDir) {
      this.destinationRoot(`${answersProject.projectName}`);
    }
    answers.destinationPath = this.destinationPath();
    this.config.set(answers);
    this.config.set(answersProject);
    this.config.set(answersRuntime);
    this.config.set(answersAPI);
    this.config.set(answersAdditional);
    this.config.set(answersFurther);
  }

  writing() {
    var answers = this.config;
    // scaffold the project
    this.sourceRoot(path.join(__dirname, "templates"));
    glob
      .sync("**", {
        cwd: this.sourceRoot(),
        nodir: true,
        dot: true
      })
      .forEach((file) => {
        if (!(file.includes('.DS_Store'))) {
          if (!((file.substring(0, 5) === 'helm/' || file.includes('/Dockerfile') || file === 'dotdockerignore' || file === 'Makefile') && answers.get('BTPRuntime') !== 'Kyma')) {
            if (!(file.includes('helm/_PROJECT_NAME_-app') && answers.get('ui') === false)) {
              if (!(file.includes('helm/_PROJECT_NAME_-db') && answers.get('hana') === false)) {
                if (!((file.includes('service-uaa.yaml') || file.includes('binding-uaa.yaml')) && answers.get('authentication') === false && answers.get('apiS4HC') === false && answers.get('apiGraph') === false && answers.get('apiDest') === false)) {
                  if (!((file.includes('service-dest.yaml') || file.includes('binding-dest.yaml')) && answers.get('apiS4HC') === false && answers.get('apiGraph') === false && answers.get('apiDest') === false)) {
                    if (!((file.includes('-redis.yaml') || file.includes('destinationrule.yaml')) && answers.get('externalSessionManagement') === false)) {
                      const sOrigin = this.templatePath(file);
                      let fileDest = file;
                      fileDest = fileDest.replace('_PROJECT_NAME_', answers.get('projectName'));
                      fileDest = fileDest.replace('dotgitignore', '.gitignore');
                      fileDest = fileDest.replace('dotdockerignore', '.dockerignore');
                      const sTarget = this.destinationPath(fileDest);
                      this.fs.copyTpl(sOrigin, sTarget, this.config.getAll());
                    }
                  }
                }
              }
            }
          }
        }
      });
  }

  async install() {
    var answers = this.config;
    var opt = { "cwd": answers.get("destinationPath") };
    if (answers.get('BTPRuntime') === "Kyma") {
      // Kyma runtime
      const yaml = require('js-yaml');
      const fs2 = require('fs');
      let cmd;
      if (answers.get("externalSessionManagement") === true) {
        // generate secret
        const k8s = require('@kubernetes/client-node');
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        let k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        this.log('Creating the external session management secret...');
        let pwdgen = require('generate-password');
        let redisPassword = pwdgen.generate({
          length: 64,
          numbers: true
        });
        let sessionSecret = pwdgen.generate({
          length: 64,
          numbers: true
        });
        let k8sSecret = {
          apiVersion: 'v1',
          kind: 'Secret',
          metadata: {
            name: answers.get('projectName') + '-redis-binding-secret',
            labels: {
              'app.kubernetes.io/managed-by': answers.get('projectName') + '-app'
            }
          },
          type: 'Opaque',
          data: {
            EXT_SESSION_MGT: Buffer.from('{"instanceName":"' + answers.get("projectName") + '-redis", "storageType":"redis", "sessionSecret": "' + sessionSecret + '"}', 'utf-8').toString('base64'),
            REDIS_PASSWORD: Buffer.from('"' + redisPassword + '"', 'utf-8').toString('base64'),
            ".metadata": Buffer.from('{"credentialProperties":[{"name":"hostname","format":"text"},{"name":"port","format":"text"},{"name":"password","format":"text"},{"name":"cluster_mode","format":"text"},{"name":"tls","format":"text"}],"metaDataProperties":[{"name":"instance_name","format":"text"},{"name":"type","format":"text"},{"name":"label","format":"text"}]}', 'utf-8').toString('base64'),
            instance_name: Buffer.from(answers.get('projectName') + '-db-' + answers.get('schemaName'), 'utf-8').toString('base64'),
            type: Buffer.from("redis", 'utf-8').toString('base64'),
            name: Buffer.from(answers.get("projectName") + "-redis", 'utf-8').toString('base64'),
            instance_name: Buffer.from(answers.get("projectName") + "-redis", 'utf-8').toString('base64'),
            hostname: Buffer.from(answers.get("projectName") + "-redis", 'utf-8').toString('base64'),
            port: Buffer.from("6379", 'utf-8').toString('base64'),
            password: Buffer.from(redisPassword, 'utf-8').toString('base64'),
            cluster_mode: Buffer.from("false", 'utf-8').toString('base64'),
            tls: Buffer.from("false", 'utf-8').toString('base64')
          }
        };
        await k8sApi.createNamespacedSecret(
          answers.get('namespace'),
          k8sSecret
        ).catch(e => this.log("createNamespacedSecret:", e.response.body));
      }
      if (answers.get("buildDeploy")) {
        this.spawnCommandSync("make", ["helm-deploy"], opt);
      } else {
        this.log("");
        this.log("You can deploy your project as follows:");
        this.log(" cd " + answers.get("projectName"));
        this.log(" make helm-deploy");
      }
    }
  }

  end() {
    var answers = this.config;
    this.log("");
    if (answers.get("authentication") && answers.get("apiGraph") && answers.get("apiGraphSameSubaccount") === false) {
      this.log("Important: Trust needs to be configured when not deploying to the subaccount of the SAP Graph service instance!");
      this.log("");
    }
    if (answers.get('BTPRuntime') === "Kyma" && (answers.get("apiS4HC") || answers.get("apiGraph"))) {
      this.log("Before deploying, consider setting values for API keys & credentials in helm/" + answers.get("projectName") + "-srv/values.yaml or set directly using the destination service REST API immediately after deployment.");
    }
    this.log("");
  }
}