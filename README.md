# Topo Creator

## What is Topo Creator?
Topo Creator is an GUI ONOS Component that provide a friendly GUI for user to drag-and-drop SDN topology and generate initial scripts to create their topology inside an Openflow-enabled switch (Pica8 3290).

## Getting started
Users can easily install Topo Creator by install ONOS from this repository.
Topo Creator can be accessed by the default route.

### Dependencies

The following packages are reuqired:

* git
* zip
* curl
* unzip
* python2.7
* Oracle JDK8

To install Oracle JDK8, use following commands (Ubuntu):
```bash
$ sudo apt-get install software-properties-common -y && \
  sudo add-apt-repository ppa:webupd8team/java -y && \
  sudo apt-get update && \
  echo "oracle-java8-installer shared/accepted-oracle-license-v1-1 select true" | sudo debconf-set-selections && \
  sudo apt-get install oracle-java8-installer oracle-java8-set-default -y
```

### Build ONOS from source

ONOS is built with [Bazel](https://bazel.build/), an open-source build tool developed by Google.
ONOS supports Bazel 0.17 You can download it from official website or package manager (e.g. apt, brew...)

1. Clone the code from ONOS gerrit repository
```bash
$ git clone https://gerrit.onosproject.org/onos
```

2. Add ONOS developer environment to your bash profile, no need to do this step again if you had done this before
```bash
$ cd onos
$ cat << EOF >> ~/.bash_profile
export ONOS_ROOT="`pwd`"
source $ONOS_ROOT/tools/dev/bash_profile
EOF
$ . ~/.bash_profile
```

3. Build ONOS with Bazel
```bash
$ cd $ONOS_ROOT
$ bazel build onos
```

### Start ONOS on local machine

To run ONOS locally on the development machine, simply run the following command:

```bash
$ bazel run onos-local [-- [clean] [debug]]
```

or simpler one:

```bash
$ ok [clean] [debug]
```
