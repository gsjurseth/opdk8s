FROM centos:7.4.1708
ARG user
ARG pass
RUN yum -y install wget curl iproute
RUN groupadd -r apigee 
RUN useradd -r -g apigee -d /opt/apigee -s /sbin/nologin -c "Apigee platform user" apigee
RUN wget https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
RUN rpm -ivh epel-release-latest-7.noarch.rpm
RUN yum -y install yum-utils 
RUN yum -y install yum-plugin-priorities 
RUN yum -y install java-1.8.0-openjdk-devel bind-utils sudo
RUN curl https://software.apigee.com/bootstrap_4.18.05.sh -o /tmp/bootstrap_4.18.05.sh
RUN JAVA_HOME=/usr/lib/jvm/java-1.8.0 bash /tmp/bootstrap_4.18.05.sh apigeeuser=$user apigeepassword=$pass
RUN JAVA_HOME=/usr/lib/jvm/java-1.8.0 /opt/apigee/apigee-service/bin/apigee-service apigee-setup install
RUN echo 'export PATH=$PATH:/opt/apigee/apigee-cassandra/bin:/opt/apigee/apigee-service/bin:/opt/apigee/apigee-zookeeper/bin' >> /etc/bashrc
RUN echo 'apigee ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

CMD /bin/bash
