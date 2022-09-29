/*
Copyright 2017 Vector Creations Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

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


import Modal from './Modal';
import VerificationRequestDialog from "./components/views/dialogs/VerificationRequestDialog";
import { verificationMethods } from 'matrix-js-sdk/src/crypto';

/**
 * :tchap: copied from 
 * https://github.com/matrix-org/matrix-react-sdk/blob/515304d32ebcfee403791c6f4f11a5ecc29e9e65/src/KeyRequestHandler.js
 */
export default class KeyRequestHandler {
    constructor(matrixClient) {
        this._matrixClient = matrixClient;

        // the user/device for which we currently have a dialog open
        this._currentUser = null;
        this._currentDevice = null;

        // userId -> deviceId -> [keyRequest] 
        //TODO should be change to a MAP
        this._pendingKeyRequests = Object.create(null);
    }

    /**
     * Handle incoming key request event
     * @param keyRequest 
     * @returns 
     */
    handleKeyRequest(keyRequest) {

        const userId = keyRequest.userId;
        const deviceId = keyRequest.deviceId;
        const requestId = keyRequest.requestId;

        if (!this._pendingKeyRequests[userId]) {
            this._pendingKeyRequests[userId] = Object.create(null);
        }
        if (!this._pendingKeyRequests[userId][deviceId]) {
            this._pendingKeyRequests[userId][deviceId] = [];
        }

        // check if we already have this request
        const requests = this._pendingKeyRequests[userId][deviceId];
        if (requests.find((r) => r.requestId === requestId)) {
            console.log(":tchap: Already have this key request, ignoring");
            return;
        }

        requests.push(keyRequest);

        if (this._currentUser) {
            // ignore for now
            console.log(":tchap: Key request, but we already have a dialog open");
            return;
        }

        this._processNextRequest();
    }

    /**
     * Handle incoming key request cancellation event
     * @param keyRequest 
     * @returns 
     */
    handleKeyRequestCancellation(cancellation) {

        // see if we can find the request in the queue
        const userId = cancellation.userId;
        const deviceId = cancellation.deviceId;
        const requestId = cancellation.requestId;

        if (userId === this._currentUser && deviceId === this._currentDevice) {
            console.log(
                ":tchap: room key request cancellation for the user we currently have a"
                + " dialog open for",
            );
            // TODO: update the dialog. For now, we just ignore the
            // cancellation.
            return;
        }

        if (!this._pendingKeyRequests[userId]) {
            return;
        }
        const requests = this._pendingKeyRequests[userId][deviceId];
        if (!requests) {
            return;
        }
        const idx = requests.findIndex((r) => r.requestId === requestId);
        if (idx < 0) {
            return;
        }
        console.log("Forgetting room key request");
        requests.splice(idx, 1);
        if (requests.length === 0) {
            delete this._pendingKeyRequests[userId][deviceId];
            if (Object.keys(this._pendingKeyRequests[userId]).length === 0) {
                delete this._pendingKeyRequests[userId];
            }
        }
    }

    _processNextRequest() {
        console.log(":tchap: _processNextRequest, pending requests:", Object.keys(this._pendingKeyRequests).length)
        console.log(":tchap: _processNextRequest, pending requests:", JSON.stringify(this._pendingKeyRequests))

        const userId = Object.keys(this._pendingKeyRequests)[0];
        if (!userId) {
            return;
        }
        const deviceId = Object.keys(this._pendingKeyRequests[userId])[0];
        if (!deviceId) {
            return;
        }
        console.log(`:tchap: Starting KeyShareDialog for ${userId}:${deviceId}`);

        const finished = (r) => {
            console.log(`:tchap: key request handler finished  for ${userId}:${deviceId}`)

            this._currentUser = null;
            this._currentDevice = null;

            if (!this._pendingKeyRequests[userId] || !this._pendingKeyRequests[userId][deviceId]) {
                // request was removed in the time the dialog was displayed
                this._processNextRequest();
                return;
            }

            //tchap: this will share keys without taking care of the state of "r" ?!
            if (r) {
                for (const req of this._pendingKeyRequests[userId][deviceId]) {
                    console.log(":tchap: share for req :", JSON.stringify(req))
                    req.share();
                }
            }
            delete this._pendingKeyRequests[userId][deviceId];
            if (Object.keys(this._pendingKeyRequests[userId]).length === 0) {
                delete this._pendingKeyRequests[userId];
            }
            this._processNextRequest();
        };

        const removeCurrentRequest = () => {
            console.log(`:tchap: key request handler finished  for ${userId}:${deviceId}`)

            this._currentUser = null;
            this._currentDevice = null;

            if (!this._pendingKeyRequests[userId] || !this._pendingKeyRequests[userId][deviceId]) {
                // request was removed in the time the dialog was displayed
                this._processNextRequest();
                return;
            }

            delete this._pendingKeyRequests[userId][deviceId];
            if (Object.keys(this._pendingKeyRequests[userId]).length === 0) {
                delete this._pendingKeyRequests[userId];
            }
            this._processNextRequest();
        }

        console.log(`:tchap: should show modal for ${userId}:${deviceId}`)

        /* const KeyShareDialog = sdk.getComponent("dialogs.KeyShareDialog");
        Modal.appendTrackedDialog('Key Share', 'Process Next Request', KeyShareDialog, {
            matrixClient: this._matrixClient,
            userId: userId,
            deviceId: deviceId,
            onFinished: finished,
        }); */

        const cli = this._matrixClient;
        const verificationRequestPromise = cli.legacyDeviceVerification(
            userId,
            deviceId,
            verificationMethods.SAS,
        );
/*         Modal.createDialog(VerificationRequestDialog, {
            verificationRequestPromise,
            member: cli.getUser(userId),
            onFinished: async () => {
                const request = await verificationRequestPromise;
                request.cancel();
            },
        }); */
        Modal.createDialog(VerificationRequestDialog, {
            verificationRequestPromise: verificationRequestPromise,
            member: cli.getUser(userId),
            onFinished: async (r) => {
                const request = await verificationRequestPromise;
                //tchap: why cancel?
                request.cancel();
                removeCurrentRequest()
            }
        });

        console.log(`:tchap: end of _processNextRequest for ${userId}:${deviceId}`)
        this._currentUser = userId;
        this._currentDevice = deviceId;
    }
}
