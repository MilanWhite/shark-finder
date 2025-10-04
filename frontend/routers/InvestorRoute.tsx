import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CenteredSpinner from "../components/CenteredSpinner";
import { URLS } from "../src/config/navigation";

import { fetchAuthSession } from "aws-amplify/auth";

interface InvestorProps {
    children: ReactNode;
}

export function InvestorRoute({ children }: InvestorProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            try {
                const session = await fetchAuthSession();
                const groups =
                    session.tokens?.accessToken.payload["cognito:groups"];
                if (Array.isArray(groups) && groups.includes("Investor")) {
                    setAllowed(true);
                } else if (Array.isArray(groups)) {
                    navigate(URLS.firmHomePage, { replace: true });
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
