/*
 * Copyright 2019-present Open Networking Foundation
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

package org.onosproject.p4runtime.api;

import com.google.common.util.concurrent.Futures;
import org.onosproject.net.pi.model.PiPipeconf;

import java.nio.ByteBuffer;
import java.util.concurrent.CompletableFuture;

import static com.google.common.base.Preconditions.checkNotNull;

/**
 * P4Runtime client interface for the pipeline configuration-related RPCs.
 */
public interface P4RuntimePipelineConfigClient {

    /**
     * Uploads and commit a pipeline configuration to the server using the
     * {@link PiPipeconf.ExtensionType#P4_INFO_TEXT} extension of the given
     * pipeconf, and the given byte buffer as the target-specific data ("P4
     * blob") to be used in the P4Runtime's {@code SetPipelineConfig} message.
     * Returns true if the operations was successful, false otherwise.
     *
     * @param pipeconf   pipeconf
     * @param deviceData target-specific data
     * @return completable future, true if the operations was successful, false
     * otherwise.
     */
    CompletableFuture<Boolean> setPipelineConfig(
            PiPipeconf pipeconf, ByteBuffer deviceData);

    /**
     * Same as {@link #setPipelineConfig(PiPipeconf, ByteBuffer)}, but blocks
     * execution.
     *
     * @param pipeconf   pipeconf
     * @param deviceData target-specific data
     * @return true if the operations was successful, false otherwise.
     */
    default boolean setPipelineConfigSync(
            PiPipeconf pipeconf, ByteBuffer deviceData) {
        checkNotNull(pipeconf);
        checkNotNull(deviceData);
        return Futures.getUnchecked(setPipelineConfig(pipeconf, deviceData));
    }

    /**
     * Returns true if the device has the given pipeconf set, false otherwise.
     * If possible, equality should be based on {@link PiPipeconf#fingerprint()},
     * otherwise, the implementation can request the server to send the whole
     * P4Info and target-specific data for comparison.
     * <p>
     * This method is expected to return {@code true} if invoked after calling
     * {@link #setPipelineConfig(PiPipeconf, ByteBuffer)} with the same
     * parameters.
     *
     * @param pipeconf   pipeconf
     * @param deviceData target-specific data
     * @return completable future, true if the device has the given pipeconf
     * set, false otherwise.
     */
    CompletableFuture<Boolean> isPipelineConfigSet(
            PiPipeconf pipeconf, ByteBuffer deviceData);

    /**
     * Same as {@link #isPipelineConfigSet(PiPipeconf, ByteBuffer)} but blocks
     * execution.
     *
     * @param pipeconf   pipeconf
     * @param deviceData target-specific data
     * @return true if the device has the given pipeconf set, false otherwise.
     */
    default boolean isPipelineConfigSetSync(
            PiPipeconf pipeconf, ByteBuffer deviceData) {
        return Futures.getUnchecked(isPipelineConfigSet(pipeconf, deviceData));
    }

    /**
     * Returns true if the device has a pipeline config set, false otherwise.
     * <p>
     * This method is expected to return {@code true} if invoked after
     * successfully calling {@link #setPipelineConfig(PiPipeconf, ByteBuffer)}
     * with any parameter.
     *
     * @return completable future, true if the device has a pipeline config set,
     * false otherwise.
     */
    CompletableFuture<Boolean> isAnyPipelineConfigSet();

    /**
     * Same as {@link #isAnyPipelineConfigSet()}, but blocks execution.
     *
     * @return true if the device has a pipeline config set, false otherwise.
     */
    default boolean isAnyPipelineConfigSetSync() {
        return Futures.getUnchecked(isAnyPipelineConfigSet());
    }
}
