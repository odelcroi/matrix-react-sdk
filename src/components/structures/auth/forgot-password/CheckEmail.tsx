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

import React from "react";

import AccessibleButton from "../../../views/elements/AccessibleButton";
import { CompoundIcon, CompoundIconColour, CompoundIconSize } from "../../CompoundIcon";
import emailPromptIcon from "../../../../../res/img/element-icons/email-prompt.svg";
import retryIcon from "../../../../../res/img/element-icons/retry.svg";
import { _t } from '../../../../languageHandler';

interface CheckEmailProps {
    email: string;
    onSubmitForm: (ev: React.FormEvent) => void;
}

/**
 * This component renders the email verification view of the forgot password flow.
 */
export const CheckEmail: React.FC<CheckEmailProps> = ({
    email,
    onSubmitForm,
}) => {
    return <div>
        <CompoundIcon
            src={`url(${emailPromptIcon})`}
            colour={CompoundIconColour.SecondardContent}
            size={CompoundIconSize.Custom}
            width={40}
            height={29}
        />
        <h1>{ _t("Check your email to continue") }</h1>
        <p>
            { _t(
                "Follow the instructions sent to <b>%(email)s</b>",
                { email: email },
                { b: t => <b>{ t }</b> },
            ) }
        </p>
        <p className="mx_VerifyEMailDialog_did-not-receive">
            <span className="mx_VerifyEMailDialog_text-light">{ _t("Did not receive it?") }</span>
            <AccessibleButton className="mx_VerifyEMailDialog_resend-button" kind="link" onClick={() => { }}>
                <CompoundIcon src={`url(${retryIcon})`} />
                Resend
            </AccessibleButton>
        </p>
        <input
            onClick={onSubmitForm}
            type="button"
            className="mx_Login_submit"
            value={_t("Next")}
        />
    </div>;
};
