#!/usr/bin/env bash
# Initialize the control plane. Run INSIDE the cp VM as root.
# Usage: sudo bash init-cp.sh <CP_IP>
# Matches CKA lab tutorial step V3. Calico v3.32.1.
set -euo pipefail

CP_IP="${1:-}"
if [ -z "$CP_IP" ]; then
  echo "ERROR: pass the control-plane IP. Example: sudo bash init-cp.sh 192.168.64.5" >&2
  exit 1
fi

# A second run keeps the cluster from the first one: kubeadm init fails on a node that has one.
# To start again, run 'sudo kubeadm reset -f' first.
if [ -f /etc/kubernetes/admin.conf ]; then
  echo "==> kubeadm init already ran on this node, skipping it"
else
  echo "==> kubeadm init (advertise $CP_IP)"
  kubeadm init --pod-network-cidr=192.168.0.0/16 --apiserver-advertise-address="$CP_IP"
fi

echo "==> Configure kubectl for the login user"
USER_HOME=$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)
mkdir -p "$USER_HOME/.kube"
cp /etc/kubernetes/admin.conf "$USER_HOME/.kube/config"
chown "$(id -u "${SUDO_USER:-root}")":"$(id -g "${SUDO_USER:-root}")" "$USER_HOME/.kube/config"

echo "==> Install Calico CNI"
KUBECONFIG=/etc/kubernetes/admin.conf \
  kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.1/manifests/calico.yaml

echo
echo "==> Control plane ready. Join command for w1:"
kubeadm token create --print-join-command
