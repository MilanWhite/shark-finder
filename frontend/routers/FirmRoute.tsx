import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredSpinner from "../components/CenteredSpinner";
import { URLS } from "../src/config/navigation";

import { fetchAuthSession } from "aws-amplify/auth";

interface FirmProps {
    children: ReactNode;
}

export function FirmRoute({ children }: FirmProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            try {
                const session = await fetchAuthSession();
                const groups =
                    session.tokens?.accessToken.payload["cognito:groups"];
                if (Array.isArray(groups) && groups.includes("Firm")) {
                    setAllowed(true);
                } else if (Array.isArray(groups)) {
                    navigate(URLS.investorHomePage, { replace: true });
                } else {
                    navigate(URLS.homePage, { replace: true });
                }
            } catch {
                navigate(URLS.homePage, { replace: true });
            } finally {
                setLoading(false);
            }
        }
        checkAdmin();
    }, [navigate]);

    if (loading) return <CenteredSpinner />;
    return <>{allowed ? children : null}</>;
}
