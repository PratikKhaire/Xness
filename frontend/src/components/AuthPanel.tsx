import { useState } from "react";
import { apiPost, setAuthToken } from "../api/client";

export default function AuthPanel({ onAuthed }: { onAuthed: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signup = async () => {
        setLoading(true);
        setError(null);
        try {
            await apiPost("/v1/user/signup", { email, password });
            await signin();
        } catch (e: any) {
            setError(e?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    const signin = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiPost<{ token: string }>("/v1/user/signin", {
                email,
                password,
            });
            setAuthToken(res.token);
            onAuthed();
        } catch (e: any) {
            setError(e?.message || "Signin failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={signin} disabled={loading}>
                Sign in
            </button>
            <button onClick={signup} disabled={loading}>
                Sign up
            </button>
            {error && <span style={{ color: "#f66" }}>{error}</span>}
        </div>
    );
}
