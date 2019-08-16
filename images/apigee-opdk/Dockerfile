FROM centos:7.4.1708
ARG user
ARG pass
RUN yum -y install wget curl iproute less
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
RUN echo 'export PATH=$PATH:/opt/apigee/apigee-cassandra/bin:/opt/apigee/apigee-service/bin:/opt/apigee/apigee-zookeeper/bin' >> /etc/profile
RUN echo 'apigee ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
RUN cp /etc/profile /opt/apigee/.bashrc
RUN chown apigee:apigee /opt/apigee/.bashrc
RUN echo 'export PS1="\u@\h \w> "' >> /opt/apigee/.bashrc
RUN chmod 775 /opt/apigee/.bashrc
RUN echo 'networkaddress.cache.ttl=0' >> /usr/lib/jvm/java-1.8.0-openjdk-1.8.0.191.b12-1.el7_6.x86_64/jre/lib/security/java.security
RUN mkdir /localdaemon
COPY ../../zk-Keeper/zk-Keeper /localdaemon

CMD /bin/bash
