helm-deploy:
<% if(hana){ -%>
	helm upgrade -n <%= namespace %> -i <%= projectName %>-db helm/<%= projectName %>-db --install<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>
	helm upgrade -n <%= namespace %> -i <%= projectName %>-srv helm/<%= projectName %>-srv --install<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% if(ui){ -%>
	helm upgrade -n <%= namespace %> -i <%= projectName %>-app helm/<%= projectName %>-app --install<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>

helm-undeploy:
<% if(ui){ -%>
	helm uninstall -n <%= namespace %> <%= projectName %>-app<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>
	helm uninstall -n <%= namespace %> <%= projectName %>-srv<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% if(hana){ -%>
	helm uninstall -n <%= namespace %> <%= projectName %>-db<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>

<% if (source === "git" && gitAuth !== "none"){ -%>
delete-git-secret:
	kubectl -n <%= namespace %> delete secret <%= gitSecretName %><% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>

<% if(externalSessionManagement){ -%>
delete-session-secret:
	kubectl -n <%= namespace %> delete secret <%= projectName %>redis-binding-secret<% if(kubeconfig !== ""){ -%> --kubeconfig <%= kubeconfig %><% } -%>

<% } -%>