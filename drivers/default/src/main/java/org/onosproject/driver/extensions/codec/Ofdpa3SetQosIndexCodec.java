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

package org.onosproject.driver.extensions.codec;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.onosproject.codec.CodecContext;
import org.onosproject.codec.JsonCodec;
import org.onosproject.driver.extensions.Ofdpa3SetQosIndex;

import static com.google.common.base.Preconditions.checkNotNull;
import static org.onlab.util.Tools.nullIsIllegal;

/**
 * JSON Codec for Ofdpa set qos index class.
 */
public class Ofdpa3SetQosIndexCodec extends JsonCodec<Ofdpa3SetQosIndex>  {

    private static final String QOS_INDEX = "qosIndex";

    private static final String MISSING_MEMBER_MESSAGE = " member is required in Ofdpa3SetQosIndex";
    private static final String MISSING_QOS_INDEX_TYPE_MESSAGE = "qosIndex cannot be null";

    @Override
    public ObjectNode encode(Ofdpa3SetQosIndex qosIndex, CodecContext context) {
        checkNotNull(qosIndex, MISSING_QOS_INDEX_TYPE_MESSAGE);
        return context.mapper().createObjectNode()
                .put(QOS_INDEX, qosIndex.qosIndex());
    }

    @Override
    public Ofdpa3SetQosIndex decode(ObjectNode json, CodecContext context) {
        if (json == null || !json.isObject()) {
            return null;
        }

        // parse ofdpa qos index
        int qosIndex = (int) nullIsIllegal(json.get(QOS_INDEX),
                QOS_INDEX + MISSING_MEMBER_MESSAGE).asInt();
        return new Ofdpa3SetQosIndex(qosIndex);
    }
}
