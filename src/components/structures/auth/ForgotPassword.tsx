/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017, 2018, 2019 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import { logger } from 'matrix-js-sdk/src/logger';
import { createClient } from "matrix-js-sdk/src/matrix";

import { _t, _td } from '../../../languageHandler';
import Modal from "../../../Modal";
import PasswordReset from "../../../PasswordReset";
import AuthPage from "../../views/auth/AuthPage";
import PassphraseField from '../../views/auth/PassphraseField';
import { PASSWORD_MIN_SCORE } from '../../views/auth/RegistrationForm';
import AuthHeader from "../../views/auth/AuthHeader";
import AuthBody from "../../views/auth/AuthBody";
import PassphraseConfirmField from "../../views/auth/PassphraseConfirmField";
import AccessibleButton from '../../views/elements/AccessibleButton';
import StyledCheckbox from '../../views/elements/StyledCheckbox';
import { ValidatedServerConfig } from '../../../utils/ValidatedServerConfig';
import emailPromptIcon from "../../../../res/img/element-icons/email-prompt.svg";
import lockIcon from "../../../../res/img/element-icons/lock.svg";
import retryIcon from "../../../../res/img/element-icons/retry.svg";
import { CompoundIcon } from '../CompoundIcon';
import QuestionDialog from '../../views/dialogs/QuestionDialog';
import { ErrorMessage } from '../ErrorMessage';
import { EnterEmail } from './forgot-password/EnterEmail';
import { CheckEmail } from './forgot-password/CheckEmail';

enum Phase {
    // Show email input
    EnterEmail = 1,
    // Email is in the process of being sent
    SendingEmail = 2,
    // Email has been sent
    EmailSent = 3,
    // Show new password input
    PasswordInput = 4,
    // Password is being resetted
    ResettingPassword = 5,
    // All done
    Done = 6,
    // Email verification pending
    EMailPending = 7,
}

interface Props {
    serverConfig: ValidatedServerConfig;
    onServerConfigChange: (serverConfig: ValidatedServerConfig) => void;
    onLoginClick?: () => void;
    onComplete: () => void;
}

interface State {
    phase: Phase;
    email: string;
    password: string;
    password2: string;
    errorText: string | null;

    serverSupportsControlOfDevicesLogout: boolean;
    logoutDevices: boolean;
}

enum ForgotPasswordField {
    Email = 'field_email',
    Password = 'field_password',
    PasswordConfirm = 'field_password_confirm',
}

export default class ForgotPassword extends React.Component<Props, State> {
    private reset: PasswordReset;

    state: State = {
        phase: Phase.EnterEmail,
        email: "",
        password: "",
        password2: "",
        errorText: null,
        serverSupportsControlOfDevicesLogout: false,
        logoutDevices: false,
    };

    public constructor(props: Props) {
        super(props);
        this.reset = new PasswordReset(this.props.serverConfig.hsUrl, this.props.serverConfig.isUrl);
    }

    public componentDidMount() {
        this.checkServerCapabilities(this.props.serverConfig);
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    // eslint-disable-next-line
    public UNSAFE_componentWillReceiveProps(newProps: Props): void {
        if (newProps.serverConfig.hsUrl === this.props.serverConfig.hsUrl &&
            newProps.serverConfig.isUrl === this.props.serverConfig.isUrl) return;

        // Do capabilities check on new URLs
        this.checkServerCapabilities(newProps.serverConfig);
    }

    private async checkServerCapabilities(serverConfig: ValidatedServerConfig): Promise<void> {
        const tempClient = createClient({
            baseUrl: serverConfig.hsUrl,
        });

        const serverSupportsControlOfDevicesLogout = await tempClient.doesServerSupportLogoutDevices();

        this.setState({
            logoutDevices: !serverSupportsControlOfDevicesLogout,
            serverSupportsControlOfDevicesLogout,
        });
    }

    private async onPhaseEmailInputSubmit() {
        this.phase = Phase.SendingEmail;

        try {
            await this.reset.requestResetToken(this.state.email);
        } catch (err: any) {
            this.setState({
                errorText: err.message,
                phase: Phase.EnterEmail,
            });
            return;
        }

        this.phase = Phase.EmailSent;
    }

    private async onPhaseEmailSentSubmit() {
        this.setState({
            phase: Phase.PasswordInput,
        });
    }

    private set phase(phase: Phase) {
        this.setState({ phase });
    }

    private renderVerifyEmailModal() {
        // to do extract component
        return () => <div>
            <img src={emailPromptIcon} />
            <h1>{ _t("Verify your email to continue") }</h1>
            <p>
                { _t(
                    `We ned to know it’s you before resetting your password.<br>
                    Click the link in the email we just sent to %(email)s`,
                    {
                        email: "mail@example.com",
                    },
                    {
                        br: () => <br />,
                    },
                ) }
            </p>
            <p className="mx_VerifyEMailDialog_did-not-receive">
                <span className="mx_VerifyEMailDialog_text-light">{ _t("Did not receive it?") }</span>
                <AccessibleButton className="mx_VerifyEMailDialog_resend-button" kind="link" onClick={() => { }}>
                    <CompoundIcon src={`url(${retryIcon})`} />
                    Resend
                </AccessibleButton>
            </p>
        </div>;
    }

    private async onPhasePasswordInputSubmit() {
        if (this.state.logoutDevices) {
            const logoutDevicesConfirmation = await this.renderConfirmLogoutDevicesDialog();
            if (!logoutDevicesConfirmation) return;
        }

        // to do: try one time before set to pending

        this.setState({
            phase: Phase.EMailPending,
        });

        const modal = Modal.createDialog(
            this.renderVerifyEmailModal(),
            {},
            "mx_VerifyEMailDialog",
        );
        await this.reset.setNewPassword(this.state.password);
        modal.close();

        this.setState({
            phase: Phase.Done,
        });
    }

    private onSubmitForm = (ev: React.FormEvent): void => {
        ev.preventDefault();
        this.setState({
            errorText: "",
        });

        switch (this.state.phase) {
            case Phase.EnterEmail:
                this.onPhaseEmailInputSubmit();
                break;
            case Phase.EmailSent:
                this.onPhaseEmailSentSubmit();
                break;
            case Phase.PasswordInput:
                this.onPhasePasswordInputSubmit();
                break;
        }
    };

    private onInputChanged = (stateKey: string, ev: React.FormEvent<HTMLInputElement>) => {
        let value = ev.currentTarget.value;
        if (stateKey === "email") value = value.trim();
        this.setState({
            [stateKey]: value,
        } as any);
    };

    renderError(message: string): JSX.Element {
        return <ErrorMessage message={message} />;
    }

    renderEnterEmail(): JSX.Element {
        return <EnterEmail
            email={this.state.email}
            errorMessage={this.state.errorText}
            loading={this.state.phase === Phase.SendingEmail}
            onInputChanged={this.onInputChanged}
            onSubmitForm={this.onSubmitForm}
        />;
    }

    async renderConfirmLogoutDevicesDialog(): Promise<boolean> {
        const { finished } = Modal.createDialog<[boolean]>(QuestionDialog, {
            title: _t('Warning!'),
            description:
                <div>
                    <p>{ !this.state.serverSupportsControlOfDevicesLogout ?
                        _t(
                            "Resetting your password on this homeserver will cause all of your devices to be " +
                            "signed out. This will delete the message encryption keys stored on them, " +
                            "making encrypted chat history unreadable.",
                        ) :
                        _t(
                            "Signing out your devices will delete the message encryption keys stored on them, " +
                            "making encrypted chat history unreadable.",
                        )
                    }</p>
                    <p>{ _t(
                        "If you want to retain access to your chat history in encrypted rooms, set up Key Backup " +
                        "or export your message keys from one of your other devices before proceeding.",
                    ) }</p>
                </div>,
            button: _t('Continue'),
        });
        const [confirmed] = await finished;
        return confirmed;
    }

    renderCheckEmail(): JSX.Element {
        return <CheckEmail
            email={this.state.email}
            onSubmitForm={this.onSubmitForm}
        />;
    }

    renderSetPassword(): JSX.Element {
        return <div>
            <img src={lockIcon} />
            <h1>{ _t("Reset your password") }</h1>
            <form onSubmit={this.onSubmitForm}>
                <div className="mx_AuthBody_fieldRow">
                    <PassphraseField
                        name="reset_password"
                        type="password"
                        label={_td("New Password")}
                        value={this.state.password}
                        minScore={PASSWORD_MIN_SCORE}
                        fieldRef={field => this[ForgotPasswordField.Password] = field}
                        onChange={this.onInputChanged.bind(this, "password")}
                        autoComplete="new-password"
                    />
                    <PassphraseConfirmField
                        name="reset_password_confirm"
                        label={_td("Confirm new password")}
                        labelRequired={_td("A new password must be entered.")}
                        labelInvalid={_td("New passwords must match each other.")}
                        value={this.state.password2}
                        password={this.state.password}
                        fieldRef={field => this[ForgotPasswordField.PasswordConfirm] = field}
                        onChange={this.onInputChanged.bind(this, "password2")}
                        autoComplete="new-password"
                    />
                </div>
                { this.state.serverSupportsControlOfDevicesLogout ?
                    <div className="mx_AuthBody_fieldRow">
                        <StyledCheckbox onChange={() => this.setState({ logoutDevices: !this.state.logoutDevices })} checked={this.state.logoutDevices}>
                            { _t("Sign out of all devices") }
                        </StyledCheckbox>
                    </div> : null
                }
                <input
                    className="mx_Login_submit"
                    type="submit"
                    value={_t("Reset password")}
                />
            </form>
        </div>;
    }

    renderDone() {
        return <div>
            <p>{ _t("Your password has been reset.") }</p>
            { this.state.logoutDevices ?
                <p>{ _t(
                    "You have been logged out of all devices and will no longer receive " +
                    "push notifications. To re-enable notifications, sign in again on each " +
                    "device.",
                ) }</p>
                : null
            }
            <input
                className="mx_Login_submit"
                type="button"
                onClick={this.props.onComplete}
                value={_t('Return to login screen')} />
        </div>;
    }

    render() {
        let resetPasswordJsx: JSX.Element;

        switch (this.state.phase) {
            case Phase.EnterEmail:
            case Phase.SendingEmail:
                resetPasswordJsx = this.renderEnterEmail();
                break;
            case Phase.EmailSent:
                resetPasswordJsx = this.renderCheckEmail();
                break;
            case Phase.PasswordInput:
                resetPasswordJsx = this.renderSetPassword();
                break;
            case Phase.ResettingPassword:
                resetPasswordJsx = <div>resetting password</div>;
                break;
            case Phase.Done:
                resetPasswordJsx = this.renderDone();
                break;
            case Phase.EMailPending:
                resetPasswordJsx = <div>email pending</div>;
                break;
            default:
                // This should not happen. However, it is logged and the user is sent to the start.
                logger.error(`unknown forgot passwort phase ${this.state.phase}`);
                this.setState({
                    phase: Phase.EnterEmail,
                });
                return;
        }

        return (
            <AuthPage>
                <AuthHeader />
                <AuthBody>
                    { resetPasswordJsx }
                </AuthBody>
            </AuthPage>
        );
    }
}
