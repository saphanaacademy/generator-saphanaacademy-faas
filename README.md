# generator-saphanaacademy-faas [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Yeoman Generator to jump-start Function-as-a-Service Applications

## Installation

First, install [Yeoman](http://yeoman.io) and generator-saphanaacademy-faas using [npm](https://www.npmjs.com/)

```bash
npm install -g yo
npm install -g generator-saphanaacademy-faas
```

## SAP BTP, Kyma runtime
We assume you have pre-installed [node.js](https://nodejs.org/).

The Kubernetes command-line tool [kubectl](https://kubernetes.io/docs/tasks/tools/) is required with the [kubelogin](https://github.com/int128/kubelogin) extension.

In order to deploy the project via the Makefile ensure that GNU [Make](https://www.gnu.org/software/make) is installed.

In order to deploy the project ensure that [Helm](https://helm.sh/docs/intro/install) is installed.

If using SAP HANA Cloud ensure you have created an instance and have configured a database mapping to the SAP BTP, Kyma runtime namespace that you will be deploying to.

Ensure that you have set the KUBECONFIG environment variable, have optionally created a namespace into which you would like to deploy the project. For example:

Mac/Linux:
```bash
chmod go-r {KUBECONFIG_FILE_PATH}
export KUBECONFIG={KUBECONFIG_FILE_PATH}
kubectl create ns dev
```
Windows:
```powershell
$ENV:KUBECONFIG="{KUBECONFIG_FILE_PATH}"
kubectl create ns dev
```

You can also specify the path to your Kubeconfig file in the generator.

To generate your new project:
```bash
yo saphanaacademy-faas
```
NB: If you prefer a rich user experience when generating your projects consider the [Application Wizard](https://marketplace.visualstudio.com/items?itemName=SAPOS.yeoman-ui).

To deploy your new project to SAP BTP, Kyma runtime:
```bash
cd <projectName>
make helm-deploy
```
If you prefer, you can issue the helm commands manually (see the generated <projectName>/Makefile) or use a CI/CD pipeline.

To undeploy your new project from SAP BTP, Kyma runtime:
```bash
cd <projectName>
make helm-undeploy
```

## Important
Please pay special attention to messages produced by the generator - especially those regarding setting of API keys & credentials!

## Getting To Know Yeoman

 * Yeoman has a heart of gold.
 * Yeoman is a person with feelings and opinions, but is very easy to work with.
 * Yeoman can be too opinionated at times but is easily convinced not to be.
 * Feel free to [learn more about Yeoman](http://yeoman.io/).

## License

Copyright (c) 2023 SAP SE or an SAP affiliate company. All rights reserved. This project is licensed under the Apache Software License, Version 2.0 except as noted otherwise in the [LICENSE](LICENSE) file.

[npm-image]: https://badge.fury.io/js/generator-saphanaacademy-faas.svg
[npm-url]: https://npmjs.org/package/generator-saphanaacademy-faas
[travis-image]: https://travis-ci.com/saphanaacademy/generator-saphanaacademy-faas.svg?branch=master
[travis-url]: https://travis-ci.com/saphanaacademy/generator-saphanaacademy-faas
[daviddm-image]: https://david-dm.org/saphanaacademy/generator-saphanaacademy-faas.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/saphanaacademy/generator-saphanaacademy-faas
