/*
 * Copyright 2016-present Open Networking Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.onosproject.openstacknetworking.impl;

import org.onlab.packet.Ethernet;
import org.onlab.packet.IPv4;
import org.onlab.packet.IpAddress;
import org.onlab.packet.IpPrefix;
import org.onlab.packet.TCP;
import org.onlab.packet.TpPort;
import org.onlab.packet.UDP;
import org.onlab.packet.VlanId;
import org.onlab.util.KryoNamespace;
import org.onosproject.core.ApplicationId;
import org.onosproject.core.CoreService;
import org.onosproject.net.DeviceId;
import org.onosproject.net.PortNumber;
import org.onosproject.net.device.DeviceService;
import org.onosproject.net.flow.DefaultTrafficSelector;
import org.onosproject.net.flow.DefaultTrafficTreatment;
import org.onosproject.net.flow.TrafficSelector;
import org.onosproject.net.flow.TrafficTreatment;
import org.onosproject.net.packet.DefaultOutboundPacket;
import org.onosproject.net.packet.InboundPacket;
import org.onosproject.net.packet.PacketContext;
import org.onosproject.net.packet.PacketProcessor;
import org.onosproject.net.packet.PacketService;
import org.onosproject.openstacknetworking.api.ExternalPeerRouter;
import org.onosproject.openstacknetworking.api.InstancePort;
import org.onosproject.openstacknetworking.api.InstancePortService;
import org.onosproject.openstacknetworking.api.OpenstackFlowRuleService;
import org.onosproject.openstacknetworking.api.OpenstackNetwork.Type;
import org.onosproject.openstacknetworking.api.OpenstackNetworkService;
import org.onosproject.openstacknetworking.api.OpenstackRouterService;
import org.onosproject.openstacknetworking.util.RulePopulatorUtil;
import org.onosproject.openstacknode.api.OpenstackNode;
import org.onosproject.openstacknode.api.OpenstackNodeService;
import org.onosproject.store.serializers.KryoNamespaces;
import org.onosproject.store.service.ConsistentMap;
import org.onosproject.store.service.DistributedSet;
import org.onosproject.store.service.Serializer;
import org.onosproject.store.service.StorageService;
import org.openstack4j.model.network.IP;
import org.openstack4j.model.network.Network;
import org.openstack4j.model.network.Port;
import org.openstack4j.model.network.Subnet;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.osgi.service.component.annotations.ReferenceCardinality;
import org.slf4j.Logger;

import java.nio.ByteBuffer;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.stream.Collectors;

import static java.util.concurrent.Executors.newSingleThreadExecutor;
import static org.onlab.util.Tools.groupedThreads;
import static org.onosproject.openstacknetworking.api.Constants.DEFAULT_GATEWAY_MAC;
import static org.onosproject.openstacknetworking.api.Constants.GW_COMMON_TABLE;
import static org.onosproject.openstacknetworking.api.Constants.OPENSTACK_NETWORKING_APP_ID;
import static org.onosproject.openstacknetworking.api.Constants.PRIORITY_SNAT_RULE;
import static org.onosproject.openstacknetworking.util.OpenstackNetworkingUtil.externalIpFromSubnet;
import static org.onosproject.openstacknetworking.util.OpenstackNetworkingUtil.externalPeerRouterFromSubnet;
import static org.onosproject.openstacknetworking.util.OpenstackNetworkingUtil.tunnelPortNumByNetType;
import static org.onosproject.openstacknode.api.OpenstackNode.NodeType.GATEWAY;
import static org.slf4j.LoggerFactory.getLogger;

/**
 * Handle packets needs SNAT.
 */
@Component(immediate = true)
public class OpenstackRoutingSnatHandler {

    private final Logger log = getLogger(getClass());

    private static final String ERR_PACKETIN = "Failed to handle packet in: ";
    private static final String ERR_UNSUPPORTED_NET_TYPE = "Unsupported network type";
    private static final long TIME_OUT_SNAT_PORT_MS = 120L * 1000L;
    private static final int TP_PORT_MINIMUM_NUM = 65000;
    private static final int TP_PORT_MAXIMUM_NUM = 65535;
    private static final int VM_PREFIX = 32;

    private static final KryoNamespace.Builder NUMBER_SERIALIZER = KryoNamespace.newBuilder()
            .register(KryoNamespaces.API);

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected CoreService coreService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected PacketService packetService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected StorageService storageService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected DeviceService deviceService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected InstancePortService instancePortService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected OpenstackNodeService osNodeService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected OpenstackNetworkService osNetworkService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected OpenstackRouterService osRouterService;

    @Reference(cardinality = ReferenceCardinality.MANDATORY)
    protected OpenstackFlowRuleService osFlowRuleService;

    private final ExecutorService eventExecutor = newSingleThreadExecutor(
            groupedThreads(this.getClass().getSimpleName(), "event-handler", log));
    private final PacketProcessor packetProcessor = new InternalPacketProcessor();

    private ConsistentMap<Integer, Long> allocatedPortNumMap;
    private DistributedSet<Integer> unUsedPortNumSet;
    private ApplicationId appId;

    @Activate
    protected void activate() {
        appId = coreService.registerApplication(OPENSTACK_NETWORKING_APP_ID);

        allocatedPortNumMap = storageService.<Integer, Long>consistentMapBuilder()
                .withSerializer(Serializer.using(NUMBER_SERIALIZER.build()))
                .withName("openstackrouting-allocatedportnummap")
                .withApplicationId(appId)
                .build();

        unUsedPortNumSet = storageService.<Integer>setBuilder()
                .withName("openstackrouting-unusedportnumset")
                .withSerializer(Serializer.using(KryoNamespaces.API))
                .build()
                .asDistributedSet();

        initializeUnusedPortNumSet();

        packetService.addProcessor(packetProcessor, PacketProcessor.director(1));
        log.info("Started");
    }

    private void initializeUnusedPortNumSet() {
        for (int i = TP_PORT_MINIMUM_NUM; i < TP_PORT_MAXIMUM_NUM; i++) {
            if (!allocatedPortNumMap.containsKey(i)) {
                unUsedPortNumSet.add(i);
            }
        }

        clearPortNumMap();
    }

    @Deactivate
    protected void deactivate() {
        packetService.removeProcessor(packetProcessor);
        eventExecutor.shutdown();
        log.info("Stopped");
    }

    private void processSnatPacket(PacketContext context, Ethernet eth) {
        IPv4 iPacket = (IPv4) eth.getPayload();
        InboundPacket packetIn = context.inPacket();

        int patPort = getPortNum();

        InstancePort srcInstPort = instancePortService.instancePort(eth.getSourceMAC());
        if (srcInstPort == null) {
            log.error(ERR_PACKETIN + "source host(MAC:{}) does not exist",
                    eth.getSourceMAC());
            return;
        }

        IpAddress srcIp = IpAddress.valueOf(iPacket.getSourceAddress());
        Subnet srcSubnet = getSourceSubnet(srcInstPort, srcIp);
        IpAddress externalGatewayIp =
                externalIpFromSubnet(srcSubnet, osRouterService, osNetworkService);

        if (externalGatewayIp == null) {
            return;
        }

        ExternalPeerRouter externalPeerRouter =
                externalPeerRouterFromSubnet(srcSubnet, osRouterService, osNetworkService);
        if (externalPeerRouter == null) {
            return;
        }

        populateSnatFlowRules(context.inPacket(),
                srcInstPort,
                TpPort.tpPort(patPort),
                externalGatewayIp, externalPeerRouter);


        packetOut(eth.duplicate(),
                packetIn.receivedFrom().deviceId(),
                patPort,
                externalGatewayIp, externalPeerRouter);
    }

    private Subnet getSourceSubnet(InstancePort instance, IpAddress srcIp) {
        Port osPort = osNetworkService.port(instance.portId());
        IP fixedIp = osPort.getFixedIps().stream()
                .filter(ip -> IpAddress.valueOf(ip.getIpAddress()).equals(srcIp))
                .findAny().orElse(null);
        if (fixedIp == null) {
            return null;
        }
        return osNetworkService.subnet(fixedIp.getSubnetId());
    }

    private void populateSnatFlowRules(InboundPacket packetIn,
                                       InstancePort srcInstPort,
                                       TpPort patPort, IpAddress externalIp,
                                       ExternalPeerRouter externalPeerRouter) {
        Network osNet = osNetworkService.network(srcInstPort.networkId());
        Type netType = osNetworkService.networkType(srcInstPort.networkId());

        if (osNet == null) {
            final String error = String.format("%s network %s not found",
                                        ERR_PACKETIN, srcInstPort.networkId());
            throw new IllegalStateException(error);
        }

        setDownstreamRules(srcInstPort,
                osNet.getProviderSegID(),
                netType,
                externalIp,
                externalPeerRouter,
                patPort,
                packetIn);

        setUpstreamRules(osNet.getProviderSegID(),
                netType,
                externalIp,
                externalPeerRouter,
                patPort,
                packetIn);
    }

    private void setDownstreamRules(InstancePort srcInstPort, String segmentId,
                                    Type networkType,
                                    IpAddress externalIp,
                                    ExternalPeerRouter externalPeerRouter,
                                    TpPort patPort,
                                    InboundPacket packetIn) {
        IPv4 iPacket = (IPv4) packetIn.parsed().getPayload();
        IpAddress internalIp = IpAddress.valueOf(iPacket.getSourceAddress());

        TrafficSelector.Builder sBuilder = DefaultTrafficSelector.builder()
                .matchEthType(Ethernet.TYPE_IPV4)
                .matchIPProtocol(iPacket.getProtocol())
                .matchIPDst(IpPrefix.valueOf(externalIp.getIp4Address(), VM_PREFIX))
                .matchIPSrc(IpPrefix.valueOf(iPacket.getDestinationAddress(), VM_PREFIX));

        TrafficTreatment.Builder tBuilder = DefaultTrafficTreatment.builder()
                .setEthDst(packetIn.parsed().getSourceMAC())
                .setIpDst(internalIp);

        if (!externalPeerRouter.vlanId().equals(VlanId.NONE)) {
            sBuilder.matchVlanId(externalPeerRouter.vlanId());
            tBuilder.popVlan();
        }

        switch (networkType) {
            case VXLAN:
            case GRE:
            case GENEVE:
                tBuilder.setTunnelId(Long.parseLong(segmentId));
                break;
            case VLAN:
                tBuilder.pushVlan()
                        .setVlanId(VlanId.vlanId(segmentId));
                break;
            default:
                final String error = String.format("%s %s",
                        ERR_UNSUPPORTED_NET_TYPE, networkType.toString());
                throw new IllegalStateException(error);
        }


        switch (iPacket.getProtocol()) {
            case IPv4.PROTOCOL_TCP:
                TCP tcpPacket = (TCP) iPacket.getPayload();
                sBuilder.matchTcpSrc(TpPort.tpPort(tcpPacket.getDestinationPort()))
                        .matchTcpDst(patPort);
                tBuilder.setTcpDst(TpPort.tpPort(tcpPacket.getSourcePort()));
                break;
            case IPv4.PROTOCOL_UDP:
                UDP udpPacket = (UDP) iPacket.getPayload();
                sBuilder.matchUdpSrc(TpPort.tpPort(udpPacket.getDestinationPort()))
                        .matchUdpDst(patPort);
                tBuilder.setUdpDst(TpPort.tpPort(udpPacket.getSourcePort()));
                break;
            default:
                break;
        }

        OpenstackNode srcNode = osNodeService.node(srcInstPort.deviceId());
        osNodeService.completeNodes(GATEWAY).forEach(gNode -> {
            TrafficTreatment treatment =
                    getDownStreamTreatment(networkType, tBuilder, gNode, srcNode);
            osFlowRuleService.setRule(
                    appId,
                    gNode.intgBridge(),
                    sBuilder.build(),
                    treatment,
                    PRIORITY_SNAT_RULE,
                    GW_COMMON_TABLE,
                    true);
        });
    }

    private TrafficTreatment getDownStreamTreatment(Type networkType,
                                                    TrafficTreatment.Builder tBuilder,
                                                    OpenstackNode gNode,
                                                    OpenstackNode srcNode) {
        TrafficTreatment.Builder tmpBuilder =
                DefaultTrafficTreatment.builder(tBuilder.build());
        switch (networkType) {
            case VXLAN:
            case GRE:
            case GENEVE:
                PortNumber portNum = tunnelPortNumByNetType(networkType, gNode);
                tmpBuilder.extension(RulePopulatorUtil.buildExtension(
                        deviceService,
                        gNode.intgBridge(),
                        srcNode.dataIp().getIp4Address()), gNode.intgBridge())
                        .setOutput(portNum);
                break;
            case VLAN:
                tmpBuilder.setOutput(gNode.vlanPortNum());
                break;
            default:
                final String error = String.format("%s %s",
                        ERR_UNSUPPORTED_NET_TYPE, networkType.toString());
                throw new IllegalStateException(error);
        }

        return tmpBuilder.build();
    }

    private void setUpstreamRules(String segmentId,
                                  Type networkType,
                                  IpAddress externalIp,
                                  ExternalPeerRouter externalPeerRouter,
                                  TpPort patPort,
                                  InboundPacket packetIn) {
        IPv4 iPacket = (IPv4) packetIn.parsed().getPayload();

        TrafficSelector.Builder sBuilder =  DefaultTrafficSelector.builder()
                .matchEthType(Ethernet.TYPE_IPV4)
                .matchIPProtocol(iPacket.getProtocol())
                .matchIPSrc(IpPrefix.valueOf(iPacket.getSourceAddress(), VM_PREFIX))
                .matchIPDst(IpPrefix.valueOf(iPacket.getDestinationAddress(), VM_PREFIX));

        TrafficTreatment.Builder tBuilder = DefaultTrafficTreatment.builder();

        switch (networkType) {
            case VXLAN:
            case GRE:
            case GENEVE:
                sBuilder.matchTunnelId(Long.parseLong(segmentId));
                break;
            case VLAN:
                sBuilder.matchVlanId(VlanId.vlanId(segmentId));
                tBuilder.popVlan();
                break;
            default:
                final String error = String.format("%s %s",
                        ERR_UNSUPPORTED_NET_TYPE, networkType.toString());
                throw new IllegalStateException(error);
        }

        switch (iPacket.getProtocol()) {
            case IPv4.PROTOCOL_TCP:
                TCP tcpPacket = (TCP) iPacket.getPayload();
                sBuilder.matchTcpSrc(TpPort.tpPort(tcpPacket.getSourcePort()))
                        .matchTcpDst(TpPort.tpPort(tcpPacket.getDestinationPort()));
                tBuilder.setTcpSrc(patPort).setEthDst(externalPeerRouter.macAddress());
                break;
            case IPv4.PROTOCOL_UDP:
                UDP udpPacket = (UDP) iPacket.getPayload();
                sBuilder.matchUdpSrc(TpPort.tpPort(udpPacket.getSourcePort()))
                        .matchUdpDst(TpPort.tpPort(udpPacket.getDestinationPort()));
                tBuilder.setUdpSrc(patPort).setEthDst(externalPeerRouter.macAddress());
                break;
            default:
                log.debug("Unsupported IPv4 protocol {}");
                break;
        }

        if (!externalPeerRouter.vlanId().equals(VlanId.NONE)) {
            tBuilder.pushVlan().setVlanId(externalPeerRouter.vlanId());
        }

        tBuilder.setIpSrc(externalIp);
        osNodeService.completeNodes(GATEWAY).forEach(gNode -> {
            TrafficTreatment.Builder tmpBuilder =
                    DefaultTrafficTreatment.builder(tBuilder.build());
            tmpBuilder.setOutput(gNode.uplinkPortNum());

            osFlowRuleService.setRule(
                    appId,
                    gNode.intgBridge(),
                    sBuilder.build(),
                    tmpBuilder.build(),
                    PRIORITY_SNAT_RULE,
                    GW_COMMON_TABLE,
                    true);
        });
    }

    private void packetOut(Ethernet ethPacketIn, DeviceId srcDevice, int patPort,
                           IpAddress externalIp, ExternalPeerRouter externalPeerRouter) {
        IPv4 iPacket = (IPv4) ethPacketIn.getPayload();
        switch (iPacket.getProtocol()) {
            case IPv4.PROTOCOL_TCP:
                iPacket.setPayload(buildPacketOutTcp(iPacket, patPort));
                break;
            case IPv4.PROTOCOL_UDP:
                iPacket.setPayload(buildPacketOutUdp(iPacket, patPort));
                break;
            default:
                log.trace("Temporally, this method can process UDP and TCP protocol.");
                return;
        }

        iPacket.setSourceAddress(externalIp.toString());
        iPacket.resetChecksum();
        iPacket.setParent(ethPacketIn);
        ethPacketIn.setSourceMACAddress(DEFAULT_GATEWAY_MAC);
        ethPacketIn.setDestinationMACAddress(externalPeerRouter.macAddress());
        ethPacketIn.setPayload(iPacket);

        if (!externalPeerRouter.vlanId().equals(VlanId.NONE)) {
            ethPacketIn.setVlanID(externalPeerRouter.vlanId().toShort());
        }

        ethPacketIn.resetChecksum();

        OpenstackNode srcNode = osNodeService.node(srcDevice);
        if (srcNode == null) {
            final String error = String.format("Cannot find openstack node for %s",
                    srcDevice);
            throw new IllegalStateException(error);
        }

        TrafficTreatment.Builder tBuilder = DefaultTrafficTreatment.builder();

        packetService.emit(new DefaultOutboundPacket(
                srcDevice,
                tBuilder.setOutput(srcNode.uplinkPortNum()).build(),
                ByteBuffer.wrap(ethPacketIn.serialize())));
    }

    private TCP buildPacketOutTcp(IPv4 iPacket, int patPort) {
        TCP tcpPacket = (TCP) iPacket.getPayload();
        tcpPacket.setSourcePort(patPort);
        tcpPacket.resetChecksum();
        tcpPacket.setParent(iPacket);

        return tcpPacket;
    }

    private UDP buildPacketOutUdp(IPv4 iPacket, int patPort) {
        UDP udpPacket = (UDP) iPacket.getPayload();
        udpPacket.setSourcePort(patPort);
        udpPacket.resetChecksum();
        udpPacket.setParent(iPacket);

        return udpPacket;
    }

    private int getPortNum() {
        if (unUsedPortNumSet.isEmpty()) {
            clearPortNumMap();
        }
        int portNum = findUnusedPortNum();
        if (portNum != 0) {
            unUsedPortNumSet.remove(portNum);
            allocatedPortNumMap.put(portNum, System.currentTimeMillis());
        }
        return portNum;
    }

    private int findUnusedPortNum() {
        return unUsedPortNumSet.stream().findAny().orElse(0);
    }

    private void clearPortNumMap() {
        allocatedPortNumMap.entrySet().forEach(e -> {
            if (System.currentTimeMillis() - e.getValue().value() > TIME_OUT_SNAT_PORT_MS) {
                allocatedPortNumMap.remove(e.getKey());
                unUsedPortNumSet.add(e.getKey());
            }
        });
    }

    private class InternalPacketProcessor implements PacketProcessor {

        @Override
        public void process(PacketContext context) {

            if (context.isHandled()) {
                return;
            }

            InboundPacket pkt = context.inPacket();
            Ethernet eth = pkt.parsed();
            if (eth == null || eth.getEtherType() == Ethernet.TYPE_ARP) {
                return;
            }

            IPv4 iPacket = (IPv4) eth.getPayload();
            switch (iPacket.getProtocol()) {
                case IPv4.PROTOCOL_ICMP:
                    break;
                case IPv4.PROTOCOL_UDP:
                    UDP udpPacket = (UDP) iPacket.getPayload();
                    if (udpPacket.getDestinationPort() == UDP.DHCP_SERVER_PORT &&
                            udpPacket.getSourcePort() == UDP.DHCP_CLIENT_PORT) {
                        break; // don't process DHCP
                    }
                default:
                    eventExecutor.execute(() -> {
                        if (!isRelevantHelper(context)) {
                            return;
                        }
                        processSnatPacket(context, eth);
                    });
                    break;
            }
        }

        private boolean isRelevantHelper(PacketContext context) {
            Set<DeviceId> gateways = osNodeService.completeNodes(GATEWAY)
                    .stream().map(OpenstackNode::intgBridge)
                    .collect(Collectors.toSet());

            return gateways.contains(context.inPacket().receivedFrom().deviceId());
        }
    }
}
