#!/usr/bin/env bash
# Run on your Mac host. Launches two Ubuntu VMs and prepares both nodes.
# Matches CKA lab tutorial steps V1 and V2.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> V1: Launch two Ubuntu 22.04 VMs"
# A second run skips the VMs that already exist instead of stopping on the error.
for NODE in cp w1; do
  if multipass info "$NODE" >/dev/null 2>&1; then
    echo "$NODE already exists, keeping it"
  else
    multipass launch --name "$NODE" --cpus 2 --memory 2G --disk 12G 22.04
  fi
done
multipass list

CP_IP=$(multipass info cp | awk '/IPv4/{print $2; exit}')
if [ -z "$CP_IP" ]; then
  echo "error: no IPv4 address for cp. Start it with 'multipass start cp' and run this again." >&2
  exit 1
fi
echo "control plane IP = $CP_IP"

echo "==> V2: Prepare both nodes"
for NODE in cp w1; do
  echo "---- preparing $NODE ----"
  multipass transfer "$HERE/prep-node.sh" "$NODE:/tmp/prep-node.sh"
  multipass exec "$NODE" -- sudo bash /tmp/prep-node.sh
done

echo
echo "==> Done. Next:"
echo "   multipass transfer $HERE/init-cp.sh cp:/tmp/init-cp.sh"
echo "   multipass exec cp -- sudo bash /tmp/init-cp.sh $CP_IP"
echo "   # then paste the printed 'kubeadm join ...' into: multipass shell w1"
