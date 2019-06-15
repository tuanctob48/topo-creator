/*
 * Copyright 2018-present Open Networking Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.onosproject.gnmi.api;

import com.google.common.annotations.Beta;
import org.onosproject.grpc.api.GrpcClientKey;
import org.onosproject.net.DeviceId;

import java.net.URI;

/**
 * Key that uniquely identifies a gNMI client.
 */
@Beta
public class GnmiClientKey extends GrpcClientKey {

    private static final String GNMI = "gNMI";

    /**
     * Creates a new gNMI client key.
     *
     * @param deviceId  ONOS device ID
     * @param serverUri gNMI server URI
     */
    public GnmiClientKey(DeviceId deviceId, URI serverUri) {
        super(GNMI, deviceId, serverUri);
    }
}
