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
package org.onosproject.cli.net;

import com.google.common.collect.Lists;
import org.apache.karaf.shell.api.action.lifecycle.Service;
import org.onosproject.cli.AbstractChoicesCompleter;
import org.onosproject.net.region.Region;

import java.util.List;

/**
 * Region type completer.
 */
@Service
public class RegionTypeCompleter extends AbstractChoicesCompleter {
    @Override
    protected List<String> choices() {
        List<String> types = Lists.newArrayList();
        for (Region.Type type : Region.Type.values()) {
            types.add(type.toString());
        }

        return types;
    }
}
