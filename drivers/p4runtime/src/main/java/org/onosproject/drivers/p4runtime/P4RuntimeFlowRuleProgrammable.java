/*
 * Copyright 2017-present Open Networking Foundation
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

package org.onosproject.drivers.p4runtime;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.Striped;
import org.onosproject.drivers.p4runtime.mirror.P4RuntimeTableMirror;
import org.onosproject.drivers.p4runtime.mirror.TimedEntry;
import org.onosproject.net.flow.DefaultFlowEntry;
import org.onosproject.net.flow.FlowEntry;
import org.onosproject.net.flow.FlowRule;
import org.onosproject.net.flow.FlowRuleProgrammable;
import org.onosproject.net.pi.model.PiCounterType;
import org.onosproject.net.pi.model.PiPipelineInterpreter;
import org.onosproject.net.pi.model.PiPipelineModel;
import org.onosproject.net.pi.model.PiTableId;
import org.onosproject.net.pi.runtime.PiCounterCell;
import org.onosproject.net.pi.runtime.PiCounterCellData;
import org.onosproject.net.pi.runtime.PiCounterCellHandle;
import org.onosproject.net.pi.runtime.PiCounterCellId;
import org.onosproject.net.pi.runtime.PiEntityType;
import org.onosproject.net.pi.runtime.PiHandle;
import org.onosproject.net.pi.runtime.PiTableEntry;
import org.onosproject.net.pi.runtime.PiTableEntryHandle;
import org.onosproject.net.pi.service.PiFlowRuleTranslator;
import org.onosproject.net.pi.service.PiTranslatedEntity;
import org.onosproject.net.pi.service.PiTranslationException;
import org.onosproject.p4runtime.api.P4RuntimeReadClient;
import org.onosproject.p4runtime.api.P4RuntimeWriteClient.UpdateType;
import org.onosproject.p4runtime.api.P4RuntimeWriteClient.WriteRequest;
import org.onosproject.p4runtime.api.P4RuntimeWriteClient.WriteResponse;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.locks.Lock;
import java.util.stream.Collectors;

import static org.onosproject.drivers.p4runtime.P4RuntimeFlowRuleProgrammable.Operation.APPLY;
import static org.onosproject.drivers.p4runtime.P4RuntimeFlowRuleProgrammable.Operation.REMOVE;
import static org.onosproject.net.flow.FlowEntry.FlowEntryState.ADDED;
import static org.onosproject.p4runtime.api.P4RuntimeWriteClient.UpdateType.DELETE;
import static org.onosproject.p4runtime.api.P4RuntimeWriteClient.UpdateType.INSERT;
import static org.onosproject.p4runtime.api.P4RuntimeWriteClient.UpdateType.MODIFY;

/**
 * Implementation of the flow rule programmable behaviour for P4Runtime.
 */
public class P4RuntimeFlowRuleProgrammable
        extends AbstractP4RuntimeHandlerBehaviour
        implements FlowRuleProgrammable {

    // When updating an existing rule, if true, we issue a DELETE operation
    // before inserting the new one, otherwise we issue a MODIFY operation. This
    // is useful fore devices that do not support MODIFY operations for table
    // entries.
    private static final String DELETE_BEFORE_UPDATE = "tableDeleteBeforeUpdate";
    private static final boolean DEFAULT_DELETE_BEFORE_UPDATE = false;

    // If true, we avoid querying the device and return what's already known by
    // the ONOS store.
    private static final String READ_FROM_MIRROR = "tableReadFromMirror";
    private static final boolean DEFAULT_READ_FROM_MIRROR = false;

    // If true, we read counters when reading table entries (if table has
    // counters). Otherwise, we don't.
    private static final String SUPPORT_TABLE_COUNTERS = "supportTableCounters";
    private static final boolean DEFAULT_SUPPORT_TABLE_COUNTERS = true;

    // If true, assumes that the device returns table entry message populated
    // with direct counter values. If false, we issue a second P4Runtime request
    // to read the direct counter values.
    private static final String READ_COUNTERS_WITH_TABLE_ENTRIES = "tableReadCountersWithTableEntries";
    private static final boolean DEFAULT_READ_COUNTERS_WITH_TABLE_ENTRIES = true;

    // True if target supports reading and writing table entries.
    private static final String SUPPORT_DEFAULT_TABLE_ENTRY = "supportDefaultTableEntry";
    private static final boolean DEFAULT_SUPPORT_DEFAULT_TABLE_ENTRY = true;

    // Used to make sure concurrent calls to write flow rules are serialized so
    // that each request gets consistent access to mirror state.
    private static final Striped<Lock> WRITE_LOCKS = Striped.lock(30);

    private PiPipelineModel pipelineModel;
    private P4RuntimeTableMirror tableMirror;
    private PiFlowRuleTranslator translator;

    @Override
    protected boolean setupBehaviour() {

        if (!super.setupBehaviour()) {
            return false;
        }

        pipelineModel = pipeconf.pipelineModel();
        tableMirror = handler().get(P4RuntimeTableMirror.class);
        translator = translationService.flowRuleTranslator();
        return true;
    }

    @Override
    public Collection<FlowEntry> getFlowEntries() {

        if (!setupBehaviour()) {
            return Collections.emptyList();
        }

        if (driverBoolProperty(READ_FROM_MIRROR, DEFAULT_READ_FROM_MIRROR)) {
            return getFlowEntriesFromMirror();
        }

        final ImmutableList.Builder<FlowEntry> result = ImmutableList.builder();
        final List<PiTableEntry> inconsistentEntries = Lists.newArrayList();

        // Read table entries from device.
        final Collection<PiTableEntry> deviceEntries = getAllTableEntriesFromDevice();
        if (deviceEntries == null) {
            // Potential error at the client level.
            return Collections.emptyList();
        }

        // Synchronize mirror with the device state.
        tableMirror.sync(deviceId, deviceEntries);

        if (deviceEntries.isEmpty()) {
            // Nothing to do.
            return Collections.emptyList();
        }

        final Map<PiTableEntry, PiCounterCellData> counterCellMap =
                readEntryCounters(deviceEntries);
        // Forge flow entries with counter values.
        for (PiTableEntry entry : deviceEntries) {
            final FlowEntry flowEntry = forgeFlowEntry(
                    entry, counterCellMap.get(entry));
            if (flowEntry == null) {
                // Entry is on device but unknown to translation service or
                // device mirror. Inconsistent. Mark for removal.
                // TODO: make this behaviour configurable
                // In some cases it's fine for the device to have rules
                // that were not installed by us, e.g. original default entry.
                if (!isOriginalDefaultEntry(entry)) {
                    inconsistentEntries.add(entry);
                }
            } else {
                result.add(flowEntry);
            }
        }

        if (!inconsistentEntries.isEmpty()) {
            // Trigger clean up of inconsistent entries.
            log.warn("Found {} inconsistent table entries on {}, removing them...",
                     inconsistentEntries.size(), deviceId);
            // Submit delete request and update mirror when done.
            client.write(pipeconf)
                    .entities(inconsistentEntries, DELETE)
                    .submit().whenComplete((response, ex) -> {
                if (ex != null) {
                    log.error("Exception removing inconsistent table entries", ex);
                } else {
                    log.debug("Successfully removed {} out of {} inconsistent entries",
                              response.success().size(), response.all().size());
                }
                tableMirror.applyWriteResponse(response);
            });

        }

        return result.build();
    }

    private Collection<PiTableEntry> getAllTableEntriesFromDevice() {
        final P4RuntimeReadClient.ReadRequest request = client.read(pipeconf);
        // Read entries from all non-constant tables, including default ones.
        pipelineModel.tables().stream()
                .filter(t -> !t.isConstantTable())
                .forEach(t -> {
                    request.tableEntries(t.id());
                    if (driverBoolProperty(SUPPORT_DEFAULT_TABLE_ENTRY,
                                           DEFAULT_SUPPORT_DEFAULT_TABLE_ENTRY) &&
                            !t.constDefaultAction().isPresent()) {
                        request.defaultTableEntry(t.id());
                    }
                });
        final P4RuntimeReadClient.ReadResponse response = request.submitSync();
        if (!response.isSuccess()) {
            return null;
        }
        return response.all(PiTableEntry.class).stream()
                // Device implementation might return duplicate entries. For
                // example if reading only default ones is not supported and
                // non-default entries are returned, by using distinct() we
                // are robust against that possibility.
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public Collection<FlowRule> applyFlowRules(Collection<FlowRule> rules) {
        return processFlowRules(rules, APPLY);
    }

    @Override
    public Collection<FlowRule> removeFlowRules(Collection<FlowRule> rules) {
        return processFlowRules(rules, REMOVE);
    }

    private FlowEntry forgeFlowEntry(PiTableEntry entry,
                                     PiCounterCellData cellData) {
        final PiTableEntryHandle handle = entry.handle(deviceId);
        final Optional<PiTranslatedEntity<FlowRule, PiTableEntry>>
                translatedEntity = translator.lookup(handle);
        final TimedEntry<PiTableEntry> timedEntry = tableMirror.get(handle);

        if (!translatedEntity.isPresent()) {
            log.warn("Table entry handle not found in translation store: {}", handle);
            return null;
        }
        if (!translatedEntity.get().translated().equals(entry)) {
            log.warn("Table entry obtained from device {} is different from " +
                             "one in in translation store: device={}, store={}",
                     deviceId, entry, translatedEntity.get().translated());
            return null;
        }
        if (timedEntry == null) {
            log.warn("Table entry handle not found in device mirror: {}", handle);
            return null;
        }

        if (cellData != null) {
            return new DefaultFlowEntry(translatedEntity.get().original(),
                                        ADDED, timedEntry.lifeSec(), cellData.packets(),
                                        cellData.bytes());
        } else {
            return new DefaultFlowEntry(translatedEntity.get().original(),
                                        ADDED, timedEntry.lifeSec(), 0, 0);
        }
    }

    private Collection<FlowEntry> getFlowEntriesFromMirror() {
        return tableMirror.getAll(deviceId).stream()
                .map(timedEntry -> forgeFlowEntry(
                        timedEntry.entry(), null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private Collection<FlowRule> processFlowRules(Collection<FlowRule> rules,
                                                  Operation driverOperation) {
        if (!setupBehaviour() || rules.isEmpty()) {
            return Collections.emptyList();
        }
        // Created batched write request.
        final WriteRequest request = client.write(pipeconf);
        // For each rule, translate to PI and append to write request.
        final Map<PiHandle, FlowRule> handleToRuleMap = Maps.newHashMap();
        final List<FlowRule> skippedRules = Lists.newArrayList();
        final CompletableFuture<WriteResponse> futureResponse;
        WRITE_LOCKS.get(deviceId).lock();
        try {
            for (FlowRule rule : rules) {
                // Translate.
                final PiTableEntry entry;
                try {
                    entry = translator.translate(rule, pipeconf);
                } catch (PiTranslationException e) {
                    log.warn("Unable to translate flow rule for pipeconf '{}': {} [{}]",
                             pipeconf.id(), e.getMessage(), rule);
                    // Next rule.
                    continue;
                }
                final PiTableEntryHandle handle = entry.handle(deviceId);
                handleToRuleMap.put(handle, rule);
                // Update translation store.
                if (driverOperation.equals(APPLY)) {
                    translator.learn(handle, new PiTranslatedEntity<>(
                            rule, entry, handle));
                } else {
                    translator.forget(handle);
                }
                // Append entry to batched write request (returns false), or skip (true)
                if (appendEntryToWriteRequestOrSkip(
                        request, handle, entry, driverOperation)) {
                    skippedRules.add(rule);
                }
            }
            if (request.pendingUpdates().isEmpty()) {
                // All good. No need to write on device.
                return rules;
            }
            // Update mirror.
            tableMirror.applyWriteRequest(request);
            // Async submit request to server.
            futureResponse = request.submit();
        } finally {
            WRITE_LOCKS.get(deviceId).unlock();
        }
        // Wait for response.
        final WriteResponse response = Futures.getUnchecked(futureResponse);
        // Derive successfully applied flow rule from response.
        final List<FlowRule> appliedRules = getAppliedFlowRules(
                response, handleToRuleMap, driverOperation);
        // Return skipped and applied rules.
        return ImmutableList.<FlowRule>builder()
                .addAll(skippedRules).addAll(appliedRules).build();
    }

    private List<FlowRule> getAppliedFlowRules(
            WriteResponse response,
            Map<PiHandle, FlowRule> handleToFlowRuleMap,
            Operation driverOperation) {
        // Returns a list of flow rules that were successfully written on the
        // server according to the given write response and operation.
        return response.success().stream()
                .filter(r -> r.entityType().equals(PiEntityType.TABLE_ENTRY))
                .filter(r -> {
                    // Filter intermediate responses (e.g. P4Runtime DELETE
                    // during FlowRule APPLY because we are performing
                    // delete-before-update)
                    return isUpdateTypeRelevant(r.updateType(), driverOperation);
                })
                .map(r -> {
                    final FlowRule rule = handleToFlowRuleMap.get(r.handle());
                    if (rule == null) {
                        log.warn("Server returned unrecognized table entry " +
                                         "handle in write response: {}", r.handle());
                    }
                    return rule;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private boolean isUpdateTypeRelevant(UpdateType p4UpdateType, Operation driverOperation) {
        switch (p4UpdateType) {
            case INSERT:
            case MODIFY:
                if (!driverOperation.equals(APPLY)) {
                    return false;
                }
                break;
            case DELETE:
                if (!driverOperation.equals(REMOVE)) {
                    return false;
                }
                break;
            default:
                log.error("Unknown update type {}", p4UpdateType);
                return false;
        }
        return true;
    }

    private boolean appendEntryToWriteRequestOrSkip(
            final WriteRequest writeRequest,
            final PiTableEntryHandle handle,
            PiTableEntry piEntryToApply,
            final Operation driverOperation) {
        // Depending on the driver operation, and if a matching rule exists on
        // the device/mirror, decide which P4Runtime update operation to perform
        // for this entry. In some cases, the entry is skipped from the write
        // request but we want to return the corresponding flow rule as
        // successfully written. In this case, we return true.
        final TimedEntry<PiTableEntry> piEntryOnDevice = tableMirror.get(handle);
        final UpdateType updateType;

        final boolean supportDefaultEntry = driverBoolProperty(
                SUPPORT_DEFAULT_TABLE_ENTRY, DEFAULT_SUPPORT_DEFAULT_TABLE_ENTRY);
        final boolean deleteBeforeUpdate = driverBoolProperty(
                DELETE_BEFORE_UPDATE, DEFAULT_DELETE_BEFORE_UPDATE);

        if (driverOperation == APPLY) {
            if (piEntryOnDevice == null) {
                // Entry is first-timer, INSERT or MODIFY if default action.
                updateType = !piEntryToApply.isDefaultAction() || !supportDefaultEntry
                        ? INSERT : MODIFY;
            } else {
                if (piEntryToApply.action().equals(piEntryOnDevice.entry().action())) {
                    // FIXME: should we check for other attributes of the table
                    //  entry? For example can we modify the priority?
                    log.debug("Ignoring re-apply of existing entry: {}", piEntryToApply);
                    return true;
                } else if (deleteBeforeUpdate && !piEntryToApply.isDefaultAction()) {
                    // Some devices return error when updating existing entries.
                    // If requested, remove entry before re-inserting the
                    // modified one, except the default action entry, that
                    // cannot be removed.
                    writeRequest.delete(handle);
                    updateType = INSERT;
                } else {
                    updateType = MODIFY;
                }
            }
        } else {
            // REMOVE.
            if (piEntryToApply.isDefaultAction()) {
                // Cannot remove default action. Instead we should use the
                // original defined by the interpreter (if any).
                piEntryToApply = getOriginalDefaultEntry(piEntryToApply.table());
                if (piEntryToApply == null) {
                    return false;
                }
                updateType = MODIFY;
            } else {
                updateType = DELETE;
            }
        }
        writeRequest.entity(piEntryToApply, updateType);
        return false;
    }

    private PiTableEntry getOriginalDefaultEntry(PiTableId tableId) {
        final PiPipelineInterpreter interpreter = getInterpreter();
        if (interpreter == null) {
            log.warn("Missing interpreter for {}, cannot get default action",
                     deviceId);
            return null;
        }
        if (!interpreter.getOriginalDefaultAction(tableId).isPresent()) {
            log.warn("Interpreter of {} doesn't define a default action for " +
                             "table {}, cannot produce default action entry",
                     deviceId, tableId);
            return null;
        }
        return PiTableEntry.builder()
                .forTable(tableId)
                .withAction(interpreter.getOriginalDefaultAction(tableId).get())
                .build();
    }

    private boolean isOriginalDefaultEntry(PiTableEntry entry) {
        if (!entry.isDefaultAction()) {
            return false;
        }
        final PiTableEntry originalDefaultEntry = getOriginalDefaultEntry(entry.table());
        return originalDefaultEntry != null &&
                originalDefaultEntry.action().equals(entry.action());
    }

    private Map<PiTableEntry, PiCounterCellData> readEntryCounters(
            Collection<PiTableEntry> tableEntries) {
        if (!driverBoolProperty(SUPPORT_TABLE_COUNTERS,
                                DEFAULT_SUPPORT_TABLE_COUNTERS)
                || tableEntries.isEmpty()) {
            return Collections.emptyMap();
        }

        final Map<PiTableEntry, PiCounterCellData> cellDataMap = Maps.newHashMap();

        // We expect the server to return table entries with counter data (if
        // the table supports counter). Here we extract such counter data and we
        // determine if there are missing counter cells (if, for example, the
        // serves does not support returning counter data with table entries)
        final Set<PiHandle> missingCellHandles = tableEntries.stream()
                .map(t -> {
                    if (t.counter() != null) {
                        // Counter data found in table entry.
                        cellDataMap.put(t, t.counter());
                        return null;
                    } else {
                        return t;
                    }
                })
                .filter(Objects::nonNull)
                // Ignore for default entries and for tables without counters.
                .filter(e -> !e.isDefaultAction())
                .filter(e -> tableHasCounter(e.table()))
                .map(PiCounterCellId::ofDirect)
                .map(id -> PiCounterCellHandle.of(deviceId, id))
                .collect(Collectors.toSet());
        // We might be sending a large read request (for thousands or more
        // of counter cell handles). We request the driver to vet this
        // operation via driver property.
        if (!missingCellHandles.isEmpty()
                && !driverBoolProperty(READ_COUNTERS_WITH_TABLE_ENTRIES,
                                       DEFAULT_READ_COUNTERS_WITH_TABLE_ENTRIES)) {
            client.read(pipeconf)
                    .handles(missingCellHandles)
                    .submitSync()
                    .all(PiCounterCell.class).stream()
                    .filter(c -> c.cellId().counterType().equals(PiCounterType.DIRECT))
                    .forEach(c -> cellDataMap.put(c.cellId().tableEntry(), c.data()));
        }

        return cellDataMap;
    }

    private boolean tableHasCounter(PiTableId tableId) {
        return pipelineModel.table(tableId).isPresent() &&
                !pipelineModel.table(tableId).get().counters().isEmpty();
    }

    enum Operation {
        APPLY, REMOVE
    }
}
