# kube-lab — kubeadm on multipass (CKA)

A real 2-node cluster (1 control plane + 1 worker) built with `kubeadm` inside
multipass VMs. This matches the CKA exam far better than KinD, because you touch
the node OS — etcd, upgrades, and static pods behave like the real exam.

- Kubernetes: v1.33
- CNI: Calico v3.32.1
- Base image: Ubuntu 22.04, arm64
- Each VM: 2 vCPU, 2 GB RAM, 12 GB disk (~4 GB RAM total)

## Prerequisite: start the multipass daemon

The daemon is not running yet. Start it, then confirm:

```bash
sudo launchctl kickstart -k system/com.canonical.multipassd
multipass list      # should print a header, no socket error
```

## Steps

### 1. Launch and prepare both nodes (host)

```bash
bash launch.sh
```

This runs tutorial steps V1 (launch cp + w1) and V2 (swap off, kernel modules,
sysctl, containerd, install kubelet/kubeadm/kubectl on both).

### 2. Initialize the control plane (cp)

Use the `control plane IP` that `launch.sh` printed:

```bash
CP_IP=$(multipass info cp | awk '/IPv4/{print $2}')
multipass transfer init-cp.sh cp:/tmp/init-cp.sh
multipass exec cp -- sudo bash /tmp/init-cp.sh "$CP_IP"
```

This runs `kubeadm init`, sets up kubeconfig, installs Calico, and prints the
`kubeadm join ...` command.

### 3. Join the worker (w1)

Copy the printed join command and run it on w1:

```bash
multipass shell w1
# paste: sudo kubeadm join <CP_IP>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

Lost the command? Regenerate it on cp:

```bash
multipass exec cp -- sudo kubeadm token create --print-join-command
```

## Verify

```bash
multipass exec cp -- kubectl get nodes
# cp and w1 both Ready after ~1 minute
```

## Reset

```bash
multipass delete cp w1 && multipass purge
```
