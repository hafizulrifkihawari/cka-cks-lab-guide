/* Shared command dataset for the CKA / CKS study guides.
   Loaded as a classic script (works over file://). No build step. */
window.CMD_DATA = {
  groups: [
    { id:'kubectl-core',     title:'kubectl Essentials & Output',        domain:'k8s',   icon:'⚙️' },
    { id:'context',          title:'Namespaces & Context',               domain:'k8s',   icon:'🗂️' },
    { id:'kubectl-gen',      title:'Imperative Resource Generation',     domain:'k8s',   icon:'⚡' },
    { id:'workloads',        title:'Workloads & Rollouts',               domain:'k8s',   icon:'📦' },
    { id:'scheduling',       title:'Scheduling & Nodes',                 domain:'k8s',   icon:'🧭' },
    { id:'services-net',     title:'Services, DNS & Ingress',            domain:'k8s',   icon:'🌐' },
    { id:'netpol',           title:'NetworkPolicy',                     domain:'k8s',   icon:'🚧' },
    { id:'storage',          title:'Storage',                            domain:'k8s',   icon:'💾' },
    { id:'rbac',             title:'RBAC',                               domain:'k8s',   icon:'🔑' },
    { id:'kubeadm',          title:'kubeadm',                            domain:'k8s',   icon:'🏗️' },
    { id:'etcd',             title:'etcdctl Backup & Restore',           domain:'k8s',   icon:'🗄️' },
    { id:'helm-kustomize',   title:'Helm & Kustomize',                   domain:'k8s',   icon:'🧩' },
    { id:'debug',            title:'Debug & Diagnostics',                domain:'k8s',   icon:'🔍' },
    { id:'systemd',          title:'systemd & Logs',                     domain:'linux', icon:'🐧' },
    { id:'crictl',           title:'crictl (Container Runtime)',         domain:'linux', icon:'📦' },
    { id:'networking-linux', title:'Linux Networking',                   domain:'linux', icon:'📡' },
    { id:'files-perms',      title:'Files & Permissions',                domain:'linux', icon:'📁' },
    { id:'processes',        title:'Processes',                         domain:'linux', icon:'🧵' },
    { id:'users-sudo',       title:'Users & sudoers',                    domain:'linux', icon:'👤' },
    { id:'openssl',          title:'openssl & Certificates',             domain:'linux', icon:'🔏' },
    { id:'vim-editor',       title:'vim Survival Keys',                  domain:'linux', icon:'⌨️' },
    { id:'misc-linux',       title:'Misc Linux',                         domain:'linux', icon:'🧰' },
    { id:'linux-basics',     title:'Linux Command Basics',               domain:'linux', icon:'🐚' },
    { id:'exam-setup',       title:'Exam-Day Terminal Setup',            domain:'linux', icon:'🏁' },
    { id:'falco',            title:'Falco',                              domain:'cks',   icon:'🦅' },
    { id:'trivy',            title:'Trivy',                              domain:'cks',   icon:'🛡️' },
    { id:'kube-bench',       title:'kube-bench',                        domain:'cks',   icon:'✅' },
    { id:'apparmor-seccomp', title:'AppArmor & seccomp',                 domain:'cks',   icon:'🔒' },
    { id:'audit-policy',     title:'Audit Policy',                       domain:'cks',   icon:'📜' },
    { id:'psa',              title:'Pod Security Admission',             domain:'cks',   icon:'🛂' },
    { id:'supply-chain',     title:'Supply Chain (cosign, images)',      domain:'cks',   icon:'🔗' }
  ],

  commands: [
    /* ---------------- kubectl-core ---------------- */
    { g:'kubectl-core', desc:'Get pods with node and IP columns', cmd:'kubectl get pods -o wide', tags:['pods','wide'] },
    { g:'kubectl-core', desc:'Watch a resource for live changes', cmd:'kubectl get pods -w', tags:['watch'] },
    { g:'kubectl-core', desc:'Get every resource in a namespace', cmd:'kubectl get all -n dev', tags:['all'] },
    { g:'kubectl-core', desc:'Get every resource in every namespace', cmd:'kubectl get all -A', tags:['all','namespaces'] },
    { g:'kubectl-core', desc:'Show full YAML for a resource', cmd:'kubectl get pod nginx -o yaml', tags:['yaml'] },
    { g:'kubectl-core', desc:'Show full JSON for a resource', cmd:'kubectl get pod nginx -o json', tags:['json'] },
    { g:'kubectl-core', desc:'Extract one field with jsonpath', cmd:"kubectl get pods -o jsonpath='{.items[*].metadata.name}'", tags:['jsonpath','output'] },
    { g:'kubectl-core', desc:'Print a custom-columns table', cmd:'kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase', tags:['custom-columns','output'] },
    { g:'kubectl-core', desc:'Sort output by a field', cmd:'kubectl get pods --sort-by=.metadata.creationTimestamp', tags:['sort'] },
    { g:'kubectl-core', desc:'Explain a field in the API schema', cmd:'kubectl explain pod.spec.containers.resources', tags:['explain','docs'] },
    { g:'kubectl-core', desc:'Show the API resource short names and scope', cmd:'kubectl api-resources', tags:['api-resources'] },
    { g:'kubectl-core', desc:'Diff a manifest against the live cluster state', cmd:'kubectl diff -f pod.yaml', tags:['diff'] },
    { g:'kubectl-core', desc:'Apply a manifest, creating or updating it', cmd:'kubectl apply -f pod.yaml', tags:['apply'] },
    { g:'kubectl-core', desc:'Edit a live resource in your $KUBE_EDITOR', cmd:'kubectl edit deploy web', tags:['edit'] },
    { g:'kubectl-core', desc:'Force-delete a stuck pod', cmd:'kubectl delete pod nginx --grace-period=0 --force', tags:['delete','stuck'] },
    { g:'kubectl-core', desc:'Show short usage help for a subcommand', cmd:'kubectl create --help', tags:['help'] },

    /* ---------------- context ---------------- */
    { g:'context', desc:'Create a namespace', cmd:'kubectl create ns dev', tags:['namespace'] },
    { g:'context', desc:'Switch to a different context', cmd:'kubectl config use-context ctx', tags:['context'] },
    { g:'context', desc:'Set the default namespace for the current context', cmd:'kubectl config set-context --current --namespace=dev', tags:['namespace','default'] },
    { g:'context', desc:'View only the active context and cluster', cmd:'kubectl config view --minify', tags:['config'] },
    { g:'context', desc:'List every context in the kubeconfig', cmd:'kubectl config get-contexts', tags:['context','list'] },
    { g:'context', desc:'Show the current context name', cmd:'kubectl config current-context', tags:['context'] },
    { g:'context', desc:'Point kubectl at a specific kubeconfig file', cmd:'export KUBECONFIG=/root/admin.conf', tags:['kubeconfig','env'] },

    /* ---------------- kubectl-gen ---------------- */
    { g:'kubectl-gen', desc:'Generate a Pod YAML skeleton without creating it', cmd:'kubectl run nginx --image=nginx --dry-run=client -o yaml', tags:['dry-run','pod','$do'], note:'The single highest-value exam alias — see exam-setup for export do=.' },
    { g:'kubectl-gen', desc:'Generate a Pod with a command and args', cmd:'kubectl run busybox --image=busybox --dry-run=client -o yaml -- /bin/sh -c "sleep 3600" > pod.yaml', tags:['pod','command'] },
    { g:'kubectl-gen', desc:'Generate a Deployment YAML skeleton', cmd:'kubectl create deploy web --image=nginx --replicas=3 --dry-run=client -o yaml > deploy.yaml', tags:['deployment'] },
    { g:'kubectl-gen', desc:'Generate a Job YAML skeleton', cmd:'kubectl create job pi --image=perl --dry-run=client -o yaml -- perl -Mbignum=bpi -wle "print bpi(100)" > job.yaml', tags:['job'] },
    { g:'kubectl-gen', desc:'Generate a CronJob YAML skeleton', cmd:'kubectl create cronjob hello --image=busybox --schedule="*/1 * * * *" --dry-run=client -o yaml -- /bin/sh -c "date" > cj.yaml', tags:['cronjob'] },
    { g:'kubectl-gen', desc:'Generate a Service YAML skeleton', cmd:'kubectl create service clusterip web-svc --tcp=80:8080 --dry-run=client -o yaml', tags:['service'] },
    { g:'kubectl-gen', desc:'Generate a ConfigMap YAML skeleton', cmd:'kubectl create cm app --from-literal=key=val --dry-run=client -o yaml', tags:['configmap'] },
    { g:'kubectl-gen', desc:'Generate a Secret YAML skeleton', cmd:'kubectl create secret generic s --from-literal=pw=secret --dry-run=client -o yaml', tags:['secret'] },
    { g:'kubectl-gen', desc:'Generate a ServiceAccount YAML skeleton', cmd:'kubectl create sa my-sa -n dev --dry-run=client -o yaml', tags:['serviceaccount'] },
    { g:'kubectl-gen', desc:'Generate a Role YAML skeleton', cmd:'kubectl create role r --verb=get,list --resource=pods --dry-run=client -o yaml', tags:['role','rbac'] },
    { g:'kubectl-gen', desc:'Generate a RoleBinding YAML skeleton', cmd:'kubectl create rolebinding rb --role=r --user=jane --dry-run=client -o yaml', tags:['rolebinding','rbac'] },
    { g:'kubectl-gen', desc:'Add resource requests and limits to a generated pod', cmd:'kubectl run web --image=nginx --dry-run=client -o yaml | kubectl set resources -f - --local --requests=cpu=100m --limits=memory=128Mi -o yaml', tags:['resources','pipe'] },
    { g:'kubectl-gen', desc:'Set labels and env vars while generating a pod', cmd:'kubectl run nginx --image=nginx --env=FOO=bar --labels=app=web --dry-run=client -o yaml', tags:['labels','env'] },

    /* ---------------- workloads ---------------- */
    { g:'workloads', desc:'Scale a Deployment', cmd:'kubectl scale deploy web --replicas=5', tags:['scale'] },
    { g:'workloads', desc:'Update the image on a running Deployment', cmd:'kubectl set image deploy/web nginx=nginx:1.26', tags:['image','update'] },
    { g:'workloads', desc:'Check the rollout status', cmd:'kubectl rollout status deploy/web', tags:['rollout'] },
    { g:'workloads', desc:'Show rollout revision history', cmd:'kubectl rollout history deploy/web', tags:['rollout','history'] },
    { g:'workloads', desc:'Roll back to the previous revision', cmd:'kubectl rollout undo deploy/web', tags:['rollout','undo'] },
    { g:'workloads', desc:'Pause a rollout', cmd:'kubectl rollout pause deploy/web', tags:['rollout','pause'] },
    { g:'workloads', desc:'Resume a paused rollout', cmd:'kubectl rollout resume deploy/web', tags:['rollout','resume'] },
    { g:'workloads', desc:'Restart all pods in a Deployment', cmd:'kubectl rollout restart deploy/web', tags:['restart'] },
    { g:'workloads', desc:'Mark an init container as a native sidecar', cmd:'# set restartPolicy: Always on the init container spec', tags:['sidecar','init-container'] },
    { g:'workloads', desc:'Create a HorizontalPodAutoscaler', cmd:'kubectl autoscale deploy web --min=2 --max=10 --cpu-percent=80', tags:['hpa','autoscale'] },
    { g:'workloads', desc:'Check why an HPA target shows unknown', cmd:'kubectl top pods', tags:['hpa','metrics-server'] },

    /* ---------------- scheduling ---------------- */
    { g:'scheduling', desc:'List nodes', cmd:'kubectl get nodes', tags:['nodes'] },
    { g:'scheduling', desc:'Mark a node unschedulable', cmd:'kubectl cordon worker-1', tags:['cordon'] },
    { g:'scheduling', desc:'Make a node schedulable again', cmd:'kubectl uncordon worker-1', tags:['uncordon'] },
    { g:'scheduling', desc:'Cordon a node and evict its pods', cmd:'kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data', tags:['drain','evict'] },
    { g:'scheduling', desc:'Add a taint to a node', cmd:'kubectl taint node n1 key=v:NoSchedule', tags:['taint'] },
    { g:'scheduling', desc:'Remove a taint from a node', cmd:'kubectl taint node n1 key=v:NoSchedule-', tags:['taint','remove'] },
    { g:'scheduling', desc:'Add a label to a node', cmd:'kubectl label node n1 disk=ssd', tags:['label'] },
    { g:'scheduling', desc:'Show a pod\'s assigned node and scheduling events', cmd:'kubectl describe pod my-pod | grep -A5 Events', tags:['events','node'] },
    { g:'scheduling', desc:'Set a pod\'s nodeSelector', cmd:'# spec.nodeSelector: {disk: ssd}', tags:['nodeselector','affinity'] },

    /* ---------------- services-net ---------------- */
    { g:'services-net', desc:'Expose a Pod as a Service', cmd:'kubectl expose pod nginx --port=80', tags:['expose'] },
    { g:'services-net', desc:'Expose a Deployment as a NodePort Service', cmd:'kubectl expose deploy web --port=80 --type=NodePort', tags:['nodeport'] },
    { g:'services-net', desc:'Expose with a different target port and name', cmd:'kubectl expose deploy web --port=80 --target-port=8080 --name=web-svc', tags:['target-port'] },
    { g:'services-net', desc:'List Services', cmd:'kubectl get svc', tags:['service'] },
    { g:'services-net', desc:'List a Service\'s endpoints — empty means the selector does not match', cmd:'kubectl get endpoints web-svc', tags:['endpoints','troubleshoot'] },
    { g:'services-net', desc:'Look up a Service\'s cluster DNS name', cmd:'# <svc>.<namespace>.svc.cluster.local', tags:['dns'] },
    { g:'services-net', desc:'Test DNS resolution from inside the cluster', cmd:'kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/agnhost:2.39 -it --rm -- nslookup web-svc', tags:['dns','debug'] },
    { g:'services-net', desc:'List Ingress objects', cmd:'kubectl get ingress -A', tags:['ingress'] },
    { g:'services-net', desc:'List Gateway API objects', cmd:'kubectl get gateway,httproute -A', tags:['gateway','httproute'] },

    /* ---------------- netpol ---------------- */
    { g:'netpol', desc:'Default-deny all ingress in a namespace', cmd:"cat <<'EOF' | kubectl apply -f -\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: default-deny, namespace: dev}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\nEOF", tags:['default-deny','ingress'] },
    { g:'netpol', desc:'Default-deny all egress in a namespace', cmd:"cat <<'EOF' | kubectl apply -f -\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: default-deny-egress, namespace: dev}\nspec:\n  podSelector: {}\n  policyTypes: [Egress]\nEOF", tags:['default-deny','egress'] },
    { g:'netpol', desc:'Block pod traffic to the cloud metadata endpoint', cmd:'# NetworkPolicy egress rule: except 169.254.169.254/32', tags:['metadata','egress','cks'] },
    { g:'netpol', desc:'List NetworkPolicy objects', cmd:'kubectl get networkpolicy -A', tags:['list'] },
    { g:'netpol', desc:'Describe a NetworkPolicy to check its selectors', cmd:'kubectl describe netpol default-deny -n dev', tags:['describe'] },

    /* ---------------- storage ---------------- */
    { g:'storage', desc:'List PersistentVolumes', cmd:'kubectl get pv', tags:['pv'] },
    { g:'storage', desc:'List PersistentVolumeClaims', cmd:'kubectl get pvc', tags:['pvc'] },
    { g:'storage', desc:'List StorageClasses', cmd:'kubectl get sc', tags:['storageclass'] },
    { g:'storage', desc:'Check why a PVC is Pending', cmd:'kubectl describe pvc my-pvc', tags:['pending','troubleshoot'] },
    { g:'storage', desc:'Describe a PersistentVolume', cmd:'kubectl describe pv my-pv', tags:['describe'] },
    { g:'storage', desc:'Requirement to expand a PVC', cmd:'# StorageClass needs allowVolumeExpansion: true', tags:['expand'] },
    { g:'storage', desc:'Edit a PVC to request more storage', cmd:'kubectl edit pvc my-pvc', tags:['expand','edit'] },

    /* ---------------- rbac ---------------- */
    { g:'rbac', desc:'Create a Role', cmd:'kubectl create role r --verb=get,list --resource=pods', tags:['role'] },
    { g:'rbac', desc:'Bind a Role to a user in one namespace', cmd:'kubectl create rolebinding rb --role=r --user=jane', tags:['rolebinding'] },
    { g:'rbac', desc:'Create a ClusterRole', cmd:'kubectl create clusterrole cr --verb=get --resource=nodes', tags:['clusterrole'] },
    { g:'rbac', desc:'Bind a ClusterRole cluster-wide', cmd:'kubectl create clusterrolebinding crb --clusterrole=cr --user=jane', tags:['clusterrolebinding'] },
    { g:'rbac', desc:'Check whether a user can perform an action', cmd:'kubectl auth can-i get pods --as=jane -n dev', tags:['can-i','test'] },
    { g:'rbac', desc:'Check another user\'s permissions across all namespaces', cmd:'kubectl auth can-i --list --as=jane', tags:['can-i','list'] },
    { g:'rbac', desc:'Bind a Role to a ServiceAccount', cmd:'kubectl create rolebinding rb --role=r --serviceaccount=dev:my-sa', tags:['serviceaccount'] },
    { g:'rbac', desc:'Stop a pod from mounting its ServiceAccount token', cmd:'# automountServiceAccountToken: false', tags:['token','harden'] },

    /* ---------------- kubeadm ---------------- */
    { g:'kubeadm', desc:'Initialize a control-plane node', cmd:'kubeadm init --pod-network-cidr=10.244.0.0/16', tags:['init'] },
    { g:'kubeadm', desc:'Print the token and command to join a worker', cmd:'kubeadm token create --print-join-command', tags:['join','token'] },
    { g:'kubeadm', desc:'List active bootstrap tokens', cmd:'kubeadm token list', tags:['token'] },
    { g:'kubeadm', desc:'Check certificate expiry dates', cmd:'kubeadm certs check-expiration', tags:['certs','expiry'] },
    { g:'kubeadm', desc:'Renew all cluster certificates', cmd:'kubeadm certs renew all', tags:['certs','renew'] },
    { g:'kubeadm', desc:'Plan an upgrade and show the target version', cmd:'kubeadm upgrade plan', tags:['upgrade'] },
    { g:'kubeadm', desc:'Apply an upgrade on the control-plane node', cmd:'kubeadm upgrade apply v1.31.0', tags:['upgrade'] },
    { g:'kubeadm', desc:'Upgrade a worker node\'s kubelet config', cmd:'kubeadm upgrade node', tags:['upgrade','worker'] },
    { g:'kubeadm', desc:'Drain, upgrade the kubelet package, then uncordon', cmd:'kubectl drain node-1 --ignore-daemonsets\napt-get install -y kubelet=1.31.0-1.1\nsystemctl restart kubelet\nkubectl uncordon node-1', tags:['upgrade','kubelet'] },
    { g:'kubeadm', desc:'Static control-plane manifest location', cmd:'/etc/kubernetes/manifests/', tags:['static-pod','path'], note:'kubelet watches this directory — edit a file here and it restarts that pod.' },

    /* ---------------- etcd ---------------- */
    { g:'etcd', desc:'Take an etcd snapshot', cmd:'ETCDCTL_API=3 etcdctl snapshot save /tmp/snap.db \\\n  --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key', tags:['snapshot','backup'], note:'The four required flags: --endpoints, --cacert, --cert, --key.' },
    { g:'etcd', desc:'Check a snapshot\'s status', cmd:'ETCDCTL_API=3 etcdctl snapshot status /tmp/snap.db -w table', tags:['status'] },
    { g:'etcd', desc:'Restore a snapshot to a new data directory', cmd:'ETCDCTL_API=3 etcdctl snapshot restore /tmp/snap.db \\\n  --data-dir=/var/lib/etcd-restore', tags:['restore'] },
    { g:'etcd', desc:'Point the static pod at the restored data directory', cmd:'# edit /etc/kubernetes/manifests/etcd.yaml hostPath to /var/lib/etcd-restore', tags:['restore','manifest'] },

    /* ---------------- helm-kustomize ---------------- */
    { g:'helm-kustomize', desc:'Apply a Kustomize overlay', cmd:'kubectl apply -k ./overlays/prod', tags:['kustomize'] },
    { g:'helm-kustomize', desc:'Preview a Kustomize build without applying', cmd:'kubectl kustomize ./overlays/prod', tags:['kustomize','preview'] },
    { g:'helm-kustomize', desc:'List installed Helm releases', cmd:'helm list -A', tags:['helm','list'] },
    { g:'helm-kustomize', desc:'Preview rendered manifests without installing', cmd:'helm template <release> <chart>', tags:['helm','template'] },
    { g:'helm-kustomize', desc:'Install a Helm chart', cmd:'helm install web ./chart -n dev --create-namespace', tags:['helm','install'] },
    { g:'helm-kustomize', desc:'Upgrade or install a Helm release', cmd:'helm upgrade --install web ./chart -n dev', tags:['helm','upgrade'] },
    { g:'helm-kustomize', desc:'Roll back a Helm release', cmd:'helm rollback web 1', tags:['helm','rollback'] },

    /* ---------------- debug ---------------- */
    { g:'debug', desc:'First command to run on any broken pod', cmd:'kubectl describe pod <name>', tags:['describe'], note:'Read the Events section first.' },
    { g:'debug', desc:'Read logs from a container that already crashed', cmd:'kubectl logs <pod> --previous', tags:['logs','crash'] },
    { g:'debug', desc:'Read logs from one container in a multi-container pod', cmd:'kubectl logs <pod> -c <container>', tags:['logs'] },
    { g:'debug', desc:'Stream logs live', cmd:'kubectl logs -f <pod>', tags:['logs','follow'] },
    { g:'debug', desc:'Open a shell in a running container', cmd:'kubectl exec -it my-pod -- bash', tags:['exec','shell'] },
    { g:'debug', desc:'Debug a distroless pod that has no shell', cmd:'kubectl debug <pod> -it --image=busybox --target=<container>', tags:['debug','distroless'] },
    { g:'debug', desc:'Create a throwaway debug pod', cmd:'kubectl debug node/<node> -it --image=busybox', tags:['debug','node'] },
    { g:'debug', desc:'Show live CPU/memory per pod', cmd:'kubectl top pods', tags:['top','metrics'] },
    { g:'debug', desc:'Show live CPU/memory per node', cmd:'kubectl top nodes', tags:['top','metrics'] },
    { g:'debug', desc:'List cluster events, newest last', cmd:'kubectl get events -A --sort-by=.lastTimestamp', tags:['events'] },
    { g:'debug', desc:'Inspect control-plane containers when kubectl is down', cmd:'crictl ps', tags:['crictl','control-plane'] },

    /* ---------------- systemd ---------------- */
    { g:'systemd', desc:'Check a service\'s status', cmd:'systemctl status kubelet', tags:['status'] },
    { g:'systemd', desc:'Restart a service', cmd:'systemctl restart kubelet', tags:['restart'] },
    { g:'systemd', desc:'Enable a service to start on boot', cmd:'systemctl enable kubelet', tags:['enable'] },
    { g:'systemd', desc:'Print a unit file', cmd:'systemctl cat kubelet', tags:['cat','unit-file'] },
    { g:'systemd', desc:'Reload systemd after editing a unit file', cmd:'systemctl daemon-reload', tags:['daemon-reload'] },
    { g:'systemd', desc:'Follow a service\'s logs live', cmd:'journalctl -u kubelet -f', tags:['journalctl','follow'] },
    { g:'systemd', desc:'Show logs since a given time', cmd:'journalctl -u kubelet --since "10 min ago"', tags:['journalctl','since'] },
    { g:'systemd', desc:'Show only the most recent boot\'s logs', cmd:'journalctl -u kubelet -b', tags:['journalctl','boot'] },
    { g:'systemd', desc:'kubelet unit and config file locations', cmd:'/var/lib/kubelet/config.yaml  /etc/systemd/system/kubelet.service.d/', tags:['kubelet','path'] },

    /* ---------------- crictl ---------------- */
    { g:'crictl', desc:'List running containers', cmd:'crictl ps', tags:['ps'] },
    { g:'crictl', desc:'List every container, including stopped ones', cmd:'crictl ps -a', tags:['ps','all'] },
    { g:'crictl', desc:'Read a container\'s logs', cmd:'crictl logs <container-id>', tags:['logs'] },
    { g:'crictl', desc:'List local images', cmd:'crictl images', tags:['images'] },
    { g:'crictl', desc:'Pull an image', cmd:'crictl pull nginx:latest', tags:['pull'] },
    { g:'crictl', desc:'Exec into a container', cmd:'crictl exec -it <id> sh', tags:['exec'] },
    { g:'crictl', desc:'Inspect a container\'s full config', cmd:'crictl inspect <container-id>', tags:['inspect'] },
    { g:'crictl', desc:'List pods known to the runtime', cmd:'crictl pods', tags:['pods'] },

    /* ---------------- networking-linux ---------------- */
    { g:'networking-linux', desc:'List listening TCP ports with owning process', cmd:'ss -ltnp', tags:['ss','ports'] },
    { g:'networking-linux', desc:'Show all sockets, listening and established', cmd:'ss -tunap', tags:['ss'] },
    { g:'networking-linux', desc:'Show interface addresses', cmd:'ip a', tags:['ip','interfaces'] },
    { g:'networking-linux', desc:'Show the routing table', cmd:'ip route', tags:['ip','routes'] },
    { g:'networking-linux', desc:'Test whether a TCP port is reachable', cmd:'nc -zv 10.0.0.5 6443', tags:['nc','port-check'] },
    { g:'networking-linux', desc:'Resolve a DNS name from a debug pod', cmd:'kubectl run dnstest --image=busybox:1.28 -it --rm -- nslookup kubernetes.default', tags:['dns','nslookup'] },
    { g:'networking-linux', desc:'Check apiserver reachability from a node', cmd:'curl -k https://127.0.0.1:6443/healthz', tags:['apiserver','healthz'] },

    /* ---------------- files-perms ---------------- */
    { g:'files-perms', desc:'Find files with a specific permission bit', cmd:"find / -perm -4000 -type f 2>/dev/null", tags:['find','suid'] },
    { g:'files-perms', desc:'Show a file\'s owner, group and mode', cmd:'stat /etc/kubernetes/admin.conf', tags:['stat'] },
    { g:'files-perms', desc:'Make a file immutable, even to root', cmd:'chattr +i /etc/important.conf', tags:['chattr','immutable'] },
    { g:'files-perms', desc:'Remove the immutable flag', cmd:'chattr -i /etc/important.conf', tags:['chattr'] },
    { g:'files-perms', desc:'Change file permissions', cmd:'chmod 600 /etc/kubernetes/pki/ca.key', tags:['chmod'] },
    { g:'files-perms', desc:'Change file ownership', cmd:'chown root:root /etc/kubernetes/pki/ca.key', tags:['chown'] },
    { g:'files-perms', desc:'Find world-writable files', cmd:'find / -xdev -type f -perm -0002 2>/dev/null', tags:['find','world-writable'] },

    /* ---------------- processes ---------------- */
    { g:'processes', desc:'List every process with full command lines', cmd:'ps -ef', tags:['ps'] },
    { g:'processes', desc:'List processes with a tree view', cmd:'ps -efH', tags:['ps','tree'] },
    { g:'processes', desc:'Show which process owns an open file or port', cmd:'lsof -i :6443', tags:['lsof'] },
    { g:'processes', desc:'Inspect a running process\'s details', cmd:'ls -l /proc/<pid>/', tags:['proc'] },
    { g:'processes', desc:'Show a process\'s environment variables', cmd:'cat /proc/<pid>/environ | tr "\\0" "\\n"', tags:['proc','env'] },
    { g:'processes', desc:'Kill a process by PID', cmd:'kill <pid>', tags:['kill'] },

    /* ---------------- users-sudo ---------------- */
    { g:'users-sudo', desc:'Add a new Linux user', cmd:'useradd -m -s /bin/bash jane', tags:['useradd'] },
    { g:'users-sudo', desc:'Set a user\'s password', cmd:'passwd jane', tags:['passwd'] },
    { g:'users-sudo', desc:'Grant passwordless sudo to a user', cmd:"echo 'jane ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/jane", tags:['sudoers'] },
    { g:'users-sudo', desc:'Check sudoers syntax before saving', cmd:'visudo -c', tags:['visudo','check'] },
    { g:'users-sudo', desc:'List a user\'s group memberships', cmd:'id jane', tags:['id','groups'] },
    { g:'users-sudo', desc:'Add a user to a group', cmd:'usermod -aG docker jane', tags:['usermod'] },

    /* ---------------- openssl ---------------- */
    { g:'openssl', desc:'View a certificate\'s details', cmd:'openssl x509 -in cert.crt -noout -text', tags:['x509','view'] },
    { g:'openssl', desc:'Check a certificate\'s expiry date only', cmd:'openssl x509 -in cert.crt -noout -enddate', tags:['x509','expiry'] },
    { g:'openssl', desc:'Decode a Kubernetes TLS secret and view the cert', cmd:"kubectl get secret tls-secret -o jsonpath='{.data.tls\\.crt}' | base64 -d | openssl x509 -noout -text", tags:['secret','decode'] },
    { g:'openssl', desc:'Generate a self-signed certificate', cmd:'openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout k.key -out c.crt -subj "/CN=host"', tags:['generate','self-signed'] },
    { g:'openssl', desc:'Generate a CSR signed by the cluster CA', cmd:'openssl req -new -key jane.key -out jane.csr -subj "/CN=jane/O=dev"', tags:['csr'] },
    { g:'openssl', desc:'Verify a certificate against a CA', cmd:'openssl verify -CAfile ca.crt cert.crt', tags:['verify'] },

    /* ---------------- vim-editor ---------------- */
    { g:'vim-editor', desc:'Jump to a line number', cmd:':42', tags:['navigation'] },
    { g:'vim-editor', desc:'Search for text', cmd:'/searchterm', tags:['search'] },
    { g:'vim-editor', desc:'Save and quit', cmd:':wq', tags:['save','quit'] },
    { g:'vim-editor', desc:'Quit without saving', cmd:':q!', tags:['quit'] },
    { g:'vim-editor', desc:'Delete the current line', cmd:'dd', tags:['delete'] },
    { g:'vim-editor', desc:'Undo the last change', cmd:'u', tags:['undo'] },
    { g:'vim-editor', desc:'Enable line numbers for this session', cmd:':set number', tags:['numbers'] },
    { g:'vim-editor', desc:'Two-space YAML indent defaults', cmd:'set tabstop=2 shiftwidth=2 expandtab', tags:['yaml','indent'], note:'Put this in ~/.vimrc so pasted YAML never breaks on tabs.' },
    { g:'vim-editor', desc:'Move by word: forward, back, to word end', cmd:'w   b   e', tags:['motion','word'] },
    { g:'vim-editor', desc:'Jump to start of line, first non-blank char, or end of line', cmd:'0   ^   $', tags:['motion','line'] },
    { g:'vim-editor', desc:'Jump to the first or last line of the file', cmd:'gg   G', tags:['motion','file'] },
    { g:'vim-editor', desc:'Yank (copy) the current line', cmd:'yy', tags:['yank','copy'] },
    { g:'vim-editor', desc:'Paste after / before the cursor', cmd:'p   P', tags:['paste'] },
    { g:'vim-editor', desc:'Select text: character, line, or block visual mode', cmd:'v   V   Ctrl+v', tags:['visual','select'] },
    { g:'vim-editor', desc:'Find and replace every match in the whole file', cmd:':%s/old/new/g', tags:['search','replace'] },
    { g:'vim-editor', desc:'Repeat the last search, forward or backward', cmd:'n   N', tags:['search'] },
    { g:'vim-editor', desc:'Enter insert mode before / after the cursor', cmd:'i   a', tags:['insert'] },
    { g:'vim-editor', desc:'Open a new line below / above and enter insert mode', cmd:'o   O', tags:['insert','newline'] },
    { g:'vim-editor', desc:'Repeat the last change', cmd:'.', tags:['repeat'] },
    { g:'vim-editor', desc:'Record a macro into register a, then run it', cmd:'qa ... q      @a', tags:['macro'], note:'qa starts recording into register a, q stops it, @a replays it. @@ repeats the last macro run.' },
    { g:'vim-editor', desc:'Split the window vertically / horizontally', cmd:':vsp   :sp', tags:['split','window'] },

    /* ---------------- misc-linux ---------------- */
    { g:'misc-linux', desc:'Decode a base64 string', cmd:'echo "c2VjcmV0" | base64 -d', tags:['base64'] },
    { g:'misc-linux', desc:'Encode a string as base64', cmd:'echo -n "secret" | base64', tags:['base64'] },
    { g:'misc-linux', desc:'Pin a package so it will not upgrade', cmd:'apt-mark hold kubelet kubeadm kubectl', tags:['apt-mark','hold'] },
    { g:'misc-linux', desc:'Unpin a held package', cmd:'apt-mark unhold kubelet', tags:['apt-mark'] },
    { g:'misc-linux', desc:'Start a persistent terminal session', cmd:'tmux new -s exam', tags:['tmux'] },
    { g:'misc-linux', desc:'Reattach to a running tmux session', cmd:'tmux attach -t exam', tags:['tmux'] },
    { g:'misc-linux', desc:'Split the tmux window vertically', cmd:'Ctrl+b %', tags:['tmux'] },

    /* ---------------- linux-basics ---------------- */
    { g:'linux-basics', desc:'Recursively search files for a pattern', cmd:'grep -rn "text" .', tags:['grep','search'] },
    { g:'linux-basics', desc:'Replace text in a file in place', cmd:"sed -i 's/old/new/g' file.txt", tags:['sed','replace'] },
    { g:'linux-basics', desc:'Print one column of output', cmd:"awk '{print $1}' file.txt", tags:['awk','column'] },
    { g:'linux-basics', desc:'Compress a directory into a .tar.gz', cmd:'tar -czvf archive.tar.gz dir/', tags:['tar','compress'] },
    { g:'linux-basics', desc:'Extract a .tar.gz archive', cmd:'tar -xzvf archive.tar.gz', tags:['tar','extract'] },
    { g:'linux-basics', desc:'Live view of running processes and resource use', cmd:'top', tags:['top','monitor'] },
    { g:'linux-basics', desc:'Force-kill a process', cmd:'kill -9 <pid>', tags:['kill','signal'], note:'-15 (SIGTERM, the default) asks a process to exit cleanly. -9 (SIGKILL) cannot be ignored — use it only when -15 does not work.' },
    { g:'linux-basics', desc:'Show disk space usage, human-readable', cmd:'df -h', tags:['df','disk'] },
    { g:'linux-basics', desc:'Show memory usage, human-readable', cmd:'free -h', tags:['free','memory'] },
    { g:'linux-basics', desc:'Check whether a host is reachable', cmd:'ping -c 4 8.8.8.8', tags:['ping','network'] },
    { g:'linux-basics', desc:'Show the network path to a host', cmd:'traceroute 8.8.8.8', tags:['traceroute','network'] },
    { g:'linux-basics', desc:'Pipe one command into another, redirect both stdout and stderr', cmd:'some_cmd | grep foo > out.txt 2>&1', tags:['pipe','redirect'] },
    { g:'linux-basics', desc:'List all files, including hidden ones, with details', cmd:'ls -la', tags:['ls'] },
    { g:'linux-basics', desc:'Create nested directories in one step', cmd:'mkdir -p a/b/c', tags:['mkdir'] },

    /* ---------------- exam-setup ---------------- */
    { g:'exam-setup', desc:'Alias kubectl to a single letter', cmd:'alias k=kubectl', tags:['alias'], note:'Do this in the first 2 minutes — every guide agrees on this one.' },
    { g:'exam-setup', desc:'Save a dry-run YAML shortcut as an env var', cmd:'export do="--dry-run=client -o yaml"', tags:['do','shortcut'] },
    { g:'exam-setup', desc:'Save a grace-period-0 delete shortcut', cmd:'export now="--force --grace-period=0"', tags:['now','shortcut'] },
    { g:'exam-setup', desc:'Enable kubectl bash completion for the alias', cmd:'source <(kubectl completion bash)\ncomplete -F __start_kubectl k', tags:['completion'] },
    { g:'exam-setup', desc:'Set the default editor kubectl edit opens', cmd:'export KUBE_EDITOR=vim', tags:['kube_editor'] },
    { g:'exam-setup', desc:'Check which CKS tools are pre-installed', cmd:'which falco trivy kube-bench etcdctl crictl', tags:['cks','tools'] },
    { g:'exam-setup', desc:'Back up a static pod manifest before editing it', cmd:'cp /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/kube-apiserver-backup.yaml', tags:['backup','static-pod'] },

    /* ---------------- falco ---------------- */
    { g:'falco', desc:'Check whether Falco is running', cmd:'systemctl status falco', tags:['status'], exams:['cks'] },
    { g:'falco', desc:'Watch Falco alerts live', cmd:'journalctl -u falco -f', tags:['alerts','journalctl'], exams:['cks'] },
    { g:'falco', desc:'Rules file locations', cmd:'/etc/falco/falco_rules.yaml  /etc/falco/rules.d/', tags:['path','rules'], exams:['cks'] },
    { g:'falco', desc:'Main Falco config file', cmd:'/etc/falco/falco.yaml', tags:['path','config'], exams:['cks'] },
    { g:'falco', desc:'Reload rules by restarting the service', cmd:'systemctl restart falco', tags:['reload'], exams:['cks'] },
    { g:'falco', desc:'Validate a rule file\'s syntax', cmd:'falco --validate /etc/falco/rules.d/my-rule.yaml', tags:['validate'], exams:['cks'] },

    /* ---------------- trivy ---------------- */
    { g:'trivy', desc:'Scan an image for all severities', cmd:'trivy image nginx:latest', tags:['image'], exams:['cks'] },
    { g:'trivy', desc:'Scan an image for HIGH and CRITICAL only', cmd:'trivy image --severity HIGH,CRITICAL nginx:latest', tags:['severity'], exams:['cks'] },
    { g:'trivy', desc:'Output scan results as JSON', cmd:'trivy image -f json nginx:latest', tags:['json'], exams:['cks'] },
    { g:'trivy', desc:'Scan a Dockerfile for misconfiguration', cmd:'trivy config ./Dockerfile', tags:['config','dockerfile'], exams:['cks'] },
    { g:'trivy', desc:'Scan a live cluster', cmd:'trivy k8s --report summary cluster', tags:['k8s'], exams:['cks'] },
    { g:'trivy', desc:'Ignore CVEs with no fix available', cmd:'trivy image --ignore-unfixed nginx:latest', tags:['ignore-unfixed'], exams:['cks'] },

    /* ---------------- kube-bench ---------------- */
    { g:'kube-bench', desc:'Check the control-plane node against the CIS Benchmark', cmd:'kube-bench run --targets master', tags:['master'], exams:['cks'] },
    { g:'kube-bench', desc:'Check a worker node', cmd:'kube-bench run --targets node', tags:['node'], exams:['cks'] },
    { g:'kube-bench', desc:'Check etcd', cmd:'kube-bench run --targets etcd', tags:['etcd'], exams:['cks'] },
    { g:'kube-bench', desc:'Run kube-bench as a Kubernetes Job', cmd:'kubectl apply -f job-master.yaml', tags:['job'], exams:['cks'] },
    { g:'kube-bench', desc:'Show only failed checks', cmd:'kube-bench run --targets master 2>&1 | grep FAIL', tags:['filter'], exams:['cks'] },

    /* ---------------- apparmor-seccomp ---------------- */
    { g:'apparmor-seccomp', desc:'Show loaded AppArmor profiles and their mode', cmd:'aa-status', tags:['status'], exams:['cks'] },
    { g:'apparmor-seccomp', desc:'Load an AppArmor profile', cmd:'apparmor_parser -r /etc/apparmor.d/my-profile', tags:['load'], exams:['cks'] },
    { g:'apparmor-seccomp', desc:'Attach an AppArmor profile to a pod (annotation)', cmd:'container.apparmor.security.beta.kubernetes.io/<container>: localhost/<profile>', tags:['annotation'], exams:['cks'] },
    { g:'apparmor-seccomp', desc:'Attach a seccomp profile with securityContext', cmd:'securityContext:\n  seccompProfile:\n    type: Localhost\n    localhostProfile: profiles/audit.json', tags:['seccomp'], exams:['cks'] },
    { g:'apparmor-seccomp', desc:'Seccomp profile directory on the node', cmd:'/var/lib/kubelet/seccomp/profiles/', tags:['path'], exams:['cks'] },
    { g:'apparmor-seccomp', desc:'Use the runtime\'s default seccomp profile', cmd:'securityContext:\n  seccompProfile:\n    type: RuntimeDefault', tags:['runtimedefault'], exams:['cks'] },

    /* ---------------- audit-policy ---------------- */
    { g:'audit-policy', desc:'apiserver flag for the audit policy file', cmd:'--audit-policy-file=/etc/kubernetes/audit-policy.yaml', tags:['flag'], exams:['cks'] },
    { g:'audit-policy', desc:'apiserver flag for where audit logs are written', cmd:'--audit-log-path=/var/log/kubernetes/audit.log', tags:['flag'], exams:['cks'] },
    { g:'audit-policy', desc:'Audit policy levels, least to most verbose', cmd:'None → Metadata → Request → RequestResponse', tags:['levels'], exams:['cks'] },
    { g:'audit-policy', desc:'Tail live audit log entries', cmd:'tail -f /var/log/kubernetes/audit.log | jq .', tags:['tail'], exams:['cks'] },

    /* ---------------- psa ---------------- */
    { g:'psa', desc:'Enforce the restricted Pod Security Standard on a namespace', cmd:'kubectl label ns dev pod-security.kubernetes.io/enforce=restricted', tags:['enforce'], exams:['cks'] },
    { g:'psa', desc:'Warn only, without blocking, for the baseline standard', cmd:'kubectl label ns dev pod-security.kubernetes.io/warn=baseline', tags:['warn'], exams:['cks'] },
    { g:'psa', desc:'The three Pod Security Standard levels', cmd:'privileged  baseline  restricted', tags:['levels'], exams:['cks'] },
    { g:'psa', desc:'Audit only, recording violations without blocking', cmd:'kubectl label ns dev pod-security.kubernetes.io/audit=restricted', tags:['audit'], exams:['cks'] },

    /* ---------------- supply-chain ---------------- */
    { g:'supply-chain', desc:'Sign a container image', cmd:'cosign sign --key cosign.key <registry>/<image>:<tag>', tags:['sign'], exams:['cks'] },
    { g:'supply-chain', desc:'Verify a signed image', cmd:'cosign verify --key cosign.pub <registry>/<image>:<tag>', tags:['verify'], exams:['cks'] },
    { g:'supply-chain', desc:'Pull raw metrics from the apiserver', cmd:'kubectl get --raw /metrics', tags:['metrics','raw'], exams:['cks'] },
    { g:'supply-chain', desc:'Restrict which registries pods may pull from', cmd:'# ImagePolicyWebhook admission controller, or an OPA/Kyverno policy', tags:['registry','admission'], exams:['cks'] },
    { g:'supply-chain', desc:'Require images to be pulled by digest, not tag', cmd:'image: nginx@sha256:<digest>', tags:['digest'], exams:['cks'] }
  ]
};
