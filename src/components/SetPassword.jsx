import React, { useState } from "react";
import { Button, Input, Typography, Card, message } from "antd";
import { useNavigate } from "react-router-dom";
import { setPass } from "../helpers/storage";
import { encryptData } from "../helpers/encryption";
// Translate 
// Translate
const { TextArea } = Input;
const { Title } = Typography;

function SetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    function validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return `Password must be at least ${minLength} characters long.`;
        }
        if (!hasUpperCase) {
            return 'Password must contain at least one uppercase letter.';
        }
        if (!hasLowerCase) {
            return 'Password must contain at least one lowercase letter.';
        }
        if (!hasNumber) {
            return 'Password must contain at least one number.';
        }
        if (!hasSpecialChar) {
            return 'Password must contain at least one special character.';
        }
        return '';
    }

    function savePassword() {
        const passwordError = validatePassword(password);
        if (passwordError) {
            message.error(passwordError);
            return;
        }
        if (password !== confirmPassword) {
            message.error("Password and Confirm Password should be same");
            return;
        }
        if (!password || !confirmPassword) {
            message.error("Either one or both fields are empty");
            return;
        }

        setPass(encryptData(password));
        navigate("/wallet");
    }

    return (
        <>
            <div className="set-password-container">
                <Card bordered={false} style={{ width: 400, margin: 'auto', padding: '20px' }}>
                    <Title level={2} style={{ textAlign: 'center' }}>Set Your Password </Title>
                    <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Please Enter a Password"
                        type="password"
                        style={{ marginBottom: '16px' }}
                    />
                    <Input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        type="password"
                        style={{ marginBottom: '16px' }}
                    />
                    <Button
                        className="frontPageButton"
                        type="primary"
                        block
                        onClick={savePassword}
                    >
                       Set Password 
                    </Button>
                </Card>
            </div>

        </>
    );
}

export default SetPassword;
