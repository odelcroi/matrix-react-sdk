/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Stores } from "../src/contexts/SDKContext";
import { PosthogAnalytics } from "../src/PosthogAnalytics";
import { SlidingSyncManager } from "../src/SlidingSyncManager";
import { RoomNotificationStateStore } from "../src/stores/notifications/RoomNotificationStateStore";
import RightPanelStore from "../src/stores/right-panel/RightPanelStore";
import { RoomViewStore } from "../src/stores/RoomViewStore";
import { SpaceStoreClass } from "../src/stores/spaces/SpaceStore";
import { WidgetLayoutStore } from "../src/stores/widgets/WidgetLayoutStore";
import WidgetStore from "../src/stores/WidgetStore";

/**
 * A class which provides the same API as Stores but adds additional unsafe setters which can
 * replace individual stores. This is useful for tests which need to mock out stores.
 */
export class TestStores extends Stores {
    public _RightPanelStore?: RightPanelStore;
    public _RoomNotificationStateStore?: RoomNotificationStateStore;
    public _RoomViewStore?: RoomViewStore;
    public _WidgetLayoutStore?: WidgetLayoutStore;
    public _WidgetStore?: WidgetStore;
    public _PosthogAnalytics?: PosthogAnalytics;
    public _SlidingSyncManager?: SlidingSyncManager;
    public _SpaceStore?: SpaceStoreClass;

    constructor() {
        super();
    }
}